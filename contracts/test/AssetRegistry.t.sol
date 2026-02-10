// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {AssetToken} from "../src/AssetToken.sol";

contract AssetRegistryTest is Test {
    AssetRegistry public assetRegistry;
    
    address creator = address(0x1);

    function setUp() public {
        assetRegistry = new AssetRegistry();
    }

    function testCreateAsset() public {
        vm.prank(creator);
        address tokenAddress = assetRegistry.createAsset("Carbon Credit Token", "CCT");
        
        // Verify token was created
        assertTrue(tokenAddress != address(0), "Token address should not be zero");
        
        // Verify token properties
        AssetToken token = AssetToken(tokenAddress);
        assertEq(token.name(), "Carbon Credit Token");
        assertEq(token.symbol(), "CCT");
        assertEq(token.owner(), creator);
    }

    function testCreateAssetEmitsEvent() public {
        vm.prank(creator);
        
        vm.expectEmit(false, true, false, true);
        emit AssetRegistry.AssetCreated(address(0), "Test Token", "TST");
        
        assetRegistry.createAsset("Test Token", "TST");
    }

    function testMultipleAssetCreation() public {
        // Create first token
        vm.prank(creator);
        address token1 = assetRegistry.createAsset("Token One", "TK1");
        
        // Create second token
        vm.prank(creator);
        address token2 = assetRegistry.createAsset("Token Two", "TK2");
        
        // Verify they have different addresses
        assertTrue(token1 != token2, "Tokens should have different addresses");
        
        // Verify both have correct properties
        assertEq(AssetToken(token1).symbol(), "TK1");
        assertEq(AssetToken(token2).symbol(), "TK2");
    }

    function testCreatorIsTokenOwner() public {
        address alice = address(0x123);
        
        vm.prank(alice);
        address tokenAddress = assetRegistry.createAsset("Alice Token", "ALT");
        
        AssetToken token = AssetToken(tokenAddress);
        assertEq(token.owner(), alice, "Token owner should be creator");
    }

    function testDifferentCreatorsOwnTheirTokens() public {
        address alice = address(0x123);
        address bob = address(0x456);
        
        vm.prank(alice);
        address aliceToken = assetRegistry.createAsset("Alice Token", "ALT");
        
        vm.prank(bob);
        address bobToken = assetRegistry.createAsset("Bob Token", "BOB");
        
        assertEq(AssetToken(aliceToken).owner(), alice);
        assertEq(AssetToken(bobToken).owner(), bob);
    }
}
