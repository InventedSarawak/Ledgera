// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";

contract AssetRegistryTest is Test {
    AssetRegistry public assetRegistry;

    function setUp() public {
        assetRegistry = new AssetRegistry();
    }
}
