// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script } from 'forge-std/Script.sol';
import { AssetRegistry } from '../src/AssetRegistry.sol';

contract AssetRegistryScript is Script {
    AssetRegistry public assetRegistry;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        assetRegistry = new AssetRegistry();

        vm.stopBroadcast();
    }
}
