// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script } from 'forge-std/Script.sol';
import { Marketplace } from '../src/Marketplace.sol';

contract MarketplaceScript is Script {
    Marketplace public marketplace;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy with deployer as owner and fee recipient
        marketplace = new Marketplace(msg.sender, msg.sender);

        vm.stopBroadcast();
    }
}
