// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MotusClinicalProfile
 * @notice ERC-721 que representa el registro financiero / de perfil básico
 *         de una persona en MotusDAO. Cada wallet puede tener como máximo
 *         un NFT de perfil.
 *
 *         La metadata (tokenURI) se almacena en IPFS/Filecoin vía web3.storage
 *         y solo contiene datos NO sensibles: wallet, rol (usuario | psm) y
 *         fecha de registro.
 */
contract MotusClinicalProfile is ERC721URIStorage, Ownable {
    /// @notice contador incremental para IDs de token
    uint256 public nextTokenId;

    /// @notice tokenId asociado a cada wallet (0 si no tiene perfil)
    mapping(address => uint256) public profileTokenOf;

    event ProfileMinted(address indexed wallet, uint256 indexed tokenId, string tokenURI);

    constructor() ERC721("Motus Clinical Profile", "MCP") Ownable(msg.sender) {}

    /**
     * @notice Mintea un nuevo perfil para una wallet.
     * @dev Solo el owner (backend) puede llamar a esta función.
     *      Enforcea máximo 1 perfil por wallet.
     * @param to Wallet que será dueña del NFT.
     * @param tokenURI URI de metadata (típicamente ipfs://CID).
     */
    function mintProfile(address to, string calldata tokenURI) external onlyOwner returns (uint256) {
        require(to != address(0), "Invalid wallet");
        require(profileTokenOf[to] == 0, "Profile already exists");

        uint256 tokenId = ++nextTokenId;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        profileTokenOf[to] = tokenId;

        emit ProfileMinted(to, tokenId, tokenURI);
        return tokenId;
    }

    /**
     * @notice Devuelve true si la wallet ya tiene un NFT de perfil.
     */
    function hasProfile(address wallet) external view returns (bool) {
        return profileTokenOf[wallet] != 0;
    }
}

