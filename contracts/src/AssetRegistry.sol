// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import './AssetToken.sol';

contract AssetRegistry {
    event AssetCreated(address indexed assetAddress, string name, string symbol);

    function createAsset(string memory name, string memory symbol) external returns (address) {
        AssetToken token = new AssetToken(name, symbol, msg.sender);
        emit AssetCreated(address(token), name, symbol);
        return address(token);
    }
}
