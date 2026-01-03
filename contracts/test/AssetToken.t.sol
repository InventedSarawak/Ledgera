// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AssetToken} from "../src/AssetToken.sol";

contract AssetTokenTest is Test {
    AssetToken public assetToken;

    function setUp() public {
        assetToken = new AssetToken("TestToken", "TTK", address(this), 1000);
    }
}
