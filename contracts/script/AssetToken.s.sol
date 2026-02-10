// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script } from 'forge-std/Script.sol';
import { AssetToken } from '../src/AssetToken.sol';

contract AssetTokenScript is Script {
    AssetToken public assetToken;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        assetToken = new AssetToken('Test Token', 'TEST', msg.sender);

        vm.stopBroadcast();
    }
}
