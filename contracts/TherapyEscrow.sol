// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TherapyEscrow
 * @notice Non-custodial escrow for a therapy session paid in a Celo ERC-20
 *         (wMXN / wARS). The platform creates the session, the patient funds it,
 *         the professional settles it after it starts, and anyone can release
 *         the 90/10 split once the challenge window passes.
 *
 *         Trust boundaries:
 *         - Payee and treasury are fixed when the session is created; neither the
 *           owner nor the oracle can redirect funds.
 *         - The patient can always exit before the session starts.
 *         - The professional can always claim after the session starts, without
 *           asking the platform.
 *         - The oracle only arbitrates disputes: it picks a refund share, never a
 *           destination.
 *
 * @dev v1 policy: a late cancellation (inside the 48h window) is enforced by the
 *      app, not the contract; on-chain the patient can still cancel before start.
 *      See specs/therapy-escrow.md.
 */
contract TherapyEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Created,
        Funded,
        Settled,
        Disputed,
        Released,
        Refunded
    }

    struct Session {
        address token;
        address patient;
        address payee;
        uint256 amount;
        uint64 startsAt;
        uint64 settledAt;
        uint32 challengeWindow;
        Status status;
    }

    uint16 public constant MAX_FEE_BPS = 2000; // hard cap: 20%
    uint256 public constant MAX_CHALLENGE_WINDOW = 7 days;
    /// @notice A funded session that never settles can be refunded after this.
    uint256 public constant STALE_AFTER = 7 days;

    address public immutable treasury;
    uint16 public immutable feeBps;
    address public immutable oracle;

    mapping(bytes32 => Session) public sessions;

    event SessionCreated(
        bytes32 indexed id,
        address indexed patient,
        address indexed payee,
        address token,
        uint256 amount,
        uint64 startsAt,
        uint32 challengeWindow
    );
    event Deposited(bytes32 indexed id, uint256 amount);
    event Settled(bytes32 indexed id, uint64 settledAt);
    event Disputed(bytes32 indexed id);
    event Released(bytes32 indexed id, uint256 payeeAmount, uint256 fee);
    event Refunded(bytes32 indexed id, uint256 amount);
    event Resolved(
        bytes32 indexed id,
        uint16 refundBps,
        uint256 refund,
        uint256 payeeAmount,
        uint256 fee
    );

    error NotPatient();
    error NotPayee();
    error NotOracle();
    error InvalidStatus();
    error InvalidConfig();
    error TooEarly();
    error TooLate();
    error NotStarted();

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    constructor(address treasury_, uint16 feeBps_, address oracle_) Ownable(msg.sender) {
        if (treasury_ == address(0) || oracle_ == address(0)) revert InvalidConfig();
        if (feeBps_ > MAX_FEE_BPS) revert InvalidConfig();
        treasury = treasury_;
        feeBps = feeBps_;
        oracle = oracle_;
    }

    /// @notice Platform creates the obligation. Only the owner (Motus backend).
    function createSession(
        bytes32 id,
        address token,
        address patient,
        address payee,
        uint256 amount,
        uint64 startsAt,
        uint32 challengeWindow
    ) external onlyOwner {
        if (sessions[id].status != Status.None) revert InvalidStatus();
        if (
            token == address(0) ||
            patient == address(0) ||
            payee == address(0) ||
            amount == 0
        ) revert InvalidConfig();
        if (startsAt < block.timestamp) revert InvalidConfig();
        if (challengeWindow > MAX_CHALLENGE_WINDOW) revert InvalidConfig();

        sessions[id] = Session({
            token: token,
            patient: patient,
            payee: payee,
            amount: amount,
            startsAt: startsAt,
            settledAt: 0,
            challengeWindow: challengeWindow,
            status: Status.Created
        });

        emit SessionCreated(id, patient, payee, token, amount, startsAt, challengeWindow);
    }

    /// @notice Patient funds the session (approve first).
    function deposit(bytes32 id) external nonReentrant {
        Session storage s = sessions[id];
        if (s.status != Status.Created) revert InvalidStatus();
        if (msg.sender != s.patient) revert NotPatient();

        s.status = Status.Funded;
        IERC20(s.token).safeTransferFrom(msg.sender, address(this), s.amount);

        emit Deposited(id, s.amount);
    }

    /// @notice Patient exits before the session starts: full refund.
    function cancelBeforeStart(bytes32 id) external nonReentrant {
        Session storage s = sessions[id];
        if (s.status != Status.Funded) revert InvalidStatus();
        if (msg.sender != s.patient) revert NotPatient();
        if (block.timestamp >= s.startsAt) revert TooLate();

        s.status = Status.Refunded;
        IERC20(s.token).safeTransfer(s.patient, s.amount);

        emit Refunded(id, s.amount);
    }

    /// @notice Professional marks the session as delivered; starts the challenge window.
    function settle(bytes32 id) external {
        Session storage s = sessions[id];
        if (s.status != Status.Funded) revert InvalidStatus();
        if (msg.sender != s.payee) revert NotPayee();
        if (block.timestamp < s.startsAt) revert NotStarted();

        s.settledAt = uint64(block.timestamp);
        s.status = Status.Settled;

        emit Settled(id, s.settledAt);
    }

    /// @notice Patient contests a settlement inside the challenge window.
    function dispute(bytes32 id) external {
        Session storage s = sessions[id];
        if (s.status != Status.Settled) revert InvalidStatus();
        if (msg.sender != s.patient) revert NotPatient();
        if (block.timestamp > uint256(s.settledAt) + s.challengeWindow) revert TooLate();

        s.status = Status.Disputed;

        emit Disputed(id);
    }

    /// @notice After the challenge window, anyone releases the 90/10 split.
    function release(bytes32 id) external nonReentrant {
        Session storage s = sessions[id];
        if (s.status != Status.Settled) revert InvalidStatus();
        if (block.timestamp < uint256(s.settledAt) + s.challengeWindow) revert TooEarly();

        s.status = Status.Released;
        _payPayeeAndFee(id, s.token, s.payee, s.amount);
    }

    /**
     * @notice Oracle resolves a dispute: `refundBps` of the amount goes back to
     *         the patient; the rest splits 90/10 between payee and treasury.
     */
    function resolve(bytes32 id, uint16 refundBps) external onlyOracle nonReentrant {
        Session storage s = sessions[id];
        if (s.status != Status.Disputed) revert InvalidStatus();
        if (refundBps > 10_000) revert InvalidConfig();

        uint256 refund = (s.amount * refundBps) / 10_000;
        uint256 remaining = s.amount - refund;

        s.status = refund == s.amount ? Status.Refunded : Status.Released;

        if (refund > 0) IERC20(s.token).safeTransfer(s.patient, refund);

        uint256 fee = (remaining * feeBps) / 10_000;
        uint256 payeeAmount = remaining - fee;
        if (payeeAmount > 0) IERC20(s.token).safeTransfer(s.payee, payeeAmount);
        if (fee > 0) IERC20(s.token).safeTransfer(treasury, fee);

        emit Resolved(id, refundBps, refund, payeeAmount, fee);
    }

    /// @notice If the professional never settles, the patient recovers after STALE_AFTER.
    function refundStale(bytes32 id) external nonReentrant {
        Session storage s = sessions[id];
        if (s.status != Status.Funded) revert InvalidStatus();
        if (msg.sender != s.patient) revert NotPatient();
        if (block.timestamp < uint256(s.startsAt) + STALE_AFTER) revert TooEarly();

        s.status = Status.Refunded;
        IERC20(s.token).safeTransfer(s.patient, s.amount);

        emit Refunded(id, s.amount);
    }

    function _payPayeeAndFee(
        bytes32 id,
        address token,
        address payee,
        uint256 amount
    ) internal {
        uint256 fee = (amount * feeBps) / 10_000;
        uint256 payeeAmount = amount - fee;

        if (payeeAmount > 0) IERC20(token).safeTransfer(payee, payeeAmount);
        if (fee > 0) IERC20(token).safeTransfer(treasury, fee);

        emit Released(id, payeeAmount, fee);
    }
}
