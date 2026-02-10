// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AssetToken} from "../src/AssetToken.sol";

contract AssetTokenTest is Test {
    AssetToken public assetToken;
    
    address owner = address(this);
    address alice = address(0x1);
    address bob = address(0x2);

    function setUp() public {
        assetToken = new AssetToken("Carbon Credit", "CC", owner);
    }

    function testInitialState() public view {
        assertEq(assetToken.name(), "Carbon Credit");
        assertEq(assetToken.symbol(), "CC");
        assertEq(assetToken.owner(), owner);
        assertEq(assetToken.totalSupply(), 0);
    }

    function testMint() public {
        uint256 amount = 1000 * 10**18;
        
        assetToken.mint(alice, amount);
        
        assertEq(assetToken.balanceOf(alice), amount);
        assertEq(assetToken.totalSupply(), amount);
    }

    function testOnlyOwnerCanMint() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(alice);
        vm.expectRevert();
        assetToken.mint(alice, amount);
    }

    function testMultipleMints() public {
        uint256 amount1 = 1000 * 10**18;
        uint256 amount2 = 500 * 10**18;
        
        assetToken.mint(alice, amount1);
        assetToken.mint(bob, amount2);
        
        assertEq(assetToken.balanceOf(alice), amount1);
        assertEq(assetToken.balanceOf(bob), amount2);
        assertEq(assetToken.totalSupply(), amount1 + amount2);
    }

    function testTransfer() public {
        uint256 amount = 1000 * 10**18;
        uint256 transferAmount = 300 * 10**18;
        
        // Mint tokens to alice
        assetToken.mint(alice, amount);
        
        // Alice transfers to bob
        vm.prank(alice);
        assetToken.transfer(bob, transferAmount);
        
        assertEq(assetToken.balanceOf(alice), amount - transferAmount);
        assertEq(assetToken.balanceOf(bob), transferAmount);
    }

    function testTransferFrom() public {
        uint256 amount = 1000 * 10**18;
        uint256 transferAmount = 300 * 10**18;
        
        // Mint tokens to alice
        assetToken.mint(alice, amount);
        
        // Alice approves bob to spend
        vm.prank(alice);
        assetToken.approve(bob, transferAmount);
        
        // Bob transfers from alice to himself
        vm.prank(bob);
        assetToken.transferFrom(alice, bob, transferAmount);
        
        assertEq(assetToken.balanceOf(alice), amount - transferAmount);
        assertEq(assetToken.balanceOf(bob), transferAmount);
    }

    function testCannotTransferMoreThanBalance() public {
        uint256 amount = 1000 * 10**18;
        uint256 transferAmount = 1500 * 10**18;
        
        assetToken.mint(alice, amount);
        
        vm.prank(alice);
        vm.expectRevert();
        assetToken.transfer(bob, transferAmount);
    }

    function testOwnershipTransfer() public {
        address newOwner = address(0x999);
        
        assetToken.transferOwnership(newOwner);
        
        assertEq(assetToken.owner(), newOwner);
        
        // New owner can mint
        vm.prank(newOwner);
        assetToken.mint(alice, 100 * 10**18);
        
        assertEq(assetToken.balanceOf(alice), 100 * 10**18);
    }

    function testOldOwnerCannotMintAfterTransfer() public {
        address newOwner = address(0x999);
        
        assetToken.transferOwnership(newOwner);
        
        // Old owner cannot mint
        vm.expectRevert();
        assetToken.mint(alice, 100 * 10**18);
    }
}
