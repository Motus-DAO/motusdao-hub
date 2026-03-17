// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MotusCeloFaucet
 * @notice Faucet simple para enviar una pequeña cantidad de CELO nativo.
 *         - Límite: 1 reclamo por address.
 *         - El owner puede cambiar el monto, pausar y retirar fondos sobrantes.
 *
 * IMPORTANTE:
 * - Debes fondear este contrato con CELO después de desplegarlo.
 */
contract MotusCeloFaucet is Ownable, ReentrancyGuard {
    /// @notice Cantidad enviada por reclamo (en wei)
    uint256 public dripAmount;

    /// @notice Marca si una address ya reclamó o no
    mapping(address => bool) public hasClaimed;

    /// @notice Flag para pausar reclamaciones en caso de emergencia
    bool public paused;

    event Claimed(address indexed recipient, uint256 amount);
    event DripAmountChanged(uint256 oldAmount, uint256 newAmount);
    event Paused(bool paused);
    event FundsWithdrawn(address indexed to, uint256 amount);

    constructor(uint256 _dripAmount) Ownable(msg.sender) {
        require(_dripAmount > 0, "Drip amount must be > 0");
        dripAmount = _dripAmount;
    }

    /**
     * @notice Reclamar CELO del faucet. Solo 1 vez por address.
     */
    function claim() external nonReentrant {
        require(!paused, "Faucet is paused");
        require(!hasClaimed[msg.sender], "Already claimed");
        require(address(this).balance >= dripAmount, "Faucet empty");

        hasClaimed[msg.sender] = true;

        (bool ok, ) = msg.sender.call{value: dripAmount}("");
        require(ok, "Transfer failed");

        emit Claimed(msg.sender, dripAmount);
    }

    /**
     * @notice Cambiar el monto del faucet (solo owner).
     */
    function setDripAmount(uint256 _dripAmount) external onlyOwner {
        require(_dripAmount > 0, "Drip amount must be > 0");
        uint256 old = dripAmount;
        dripAmount = _dripAmount;
        emit DripAmountChanged(old, _dripAmount);
    }

    /**
     * @notice Pausar / despausar reclamos (solo owner).
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    /**
     * @notice Retirar fondos sobrantes del faucet (solo owner).
     */
    function withdraw(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid to");
        require(amount <= address(this).balance, "Insufficient balance");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Withdraw failed");
        emit FundsWithdrawn(to, amount);
    }

    /// @notice Permitir recibir CELO directamente (fundeo)
    receive() external payable {}
}

