// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Test } from 'forge-std/Test.sol';
import { Marketplace } from '../src/Marketplace.sol';
import { AssetToken } from '../src/AssetToken.sol';

contract MarketplaceTest is Test {
    Marketplace public marketplace;
    AssetToken public token;

    address seller = address(0x1);
    address buyer = address(0x2);
    address owner = address(this);
    address feeRecipient = address(0x999);

    uint256 constant INITIAL_BALANCE = 100 ether;
    uint256 constant TOKEN_AMOUNT = 1000 * 10 ** 18;
    uint256 constant TOKEN_PRICE = 0.01 ether;
    uint256 constant LISTING_FEE = 0.001 ether;

    function setUp() public {
        // Deploy contracts
        marketplace = new Marketplace(owner, feeRecipient);
        token = new AssetToken('Carbon Credit', 'CC', owner);

        // Mint tokens to seller
        token.mint(seller, TOKEN_AMOUNT);

        // Give buyer and seller some ETH
        vm.deal(buyer, INITIAL_BALANCE);
        vm.deal(seller, INITIAL_BALANCE);
    }

    function testListToken() public {
        uint256 listingAmount = 100 * 10 ** 18;

        // Approve marketplace to transfer tokens
        vm.prank(seller);
        token.approve(address(marketplace), listingAmount);

        // List tokens with listing fee
        vm.prank(seller);
        marketplace.listToken{ value: LISTING_FEE }(address(token), listingAmount, TOKEN_PRICE);

        // Verify listing
        (address listingSeller, address listedToken, uint256 price, uint256 amount, bool active) = marketplace.listings(
            0
        );

        assertEq(listingSeller, seller);
        assertEq(listedToken, address(token));
        assertEq(price, TOKEN_PRICE);
        assertEq(amount, listingAmount);
        assertTrue(active);
        assertEq(marketplace.listingCount(), 1);

        // Verify listing fee was transferred
        assertEq(feeRecipient.balance, LISTING_FEE);
    }

    function testBuyToken() public {
        uint256 listingAmount = 100 * 10 ** 18;
        uint256 totalPrice = (TOKEN_PRICE * listingAmount) / 1e18;

        // Setup listing
        vm.startPrank(seller);
        token.approve(address(marketplace), listingAmount);
        marketplace.listToken{ value: LISTING_FEE }(address(token), listingAmount, TOKEN_PRICE);
        vm.stopPrank();

        uint256 sellerBalanceBefore = seller.balance;
        uint256 buyerTokenBalanceBefore = token.balanceOf(buyer);
        uint256 feeRecipientBalanceBefore = feeRecipient.balance;

        // Calculate expected amounts
        uint256 expectedFee = (totalPrice * 250) / 10000; // 2.5%
        uint256 expectedSellerAmount = totalPrice - expectedFee;

        // Buy tokens
        vm.prank(buyer);
        marketplace.buyToken{ value: totalPrice }(0);

        // Verify purchase
        assertEq(token.balanceOf(buyer), buyerTokenBalanceBefore + listingAmount);
        assertEq(seller.balance, sellerBalanceBefore + expectedSellerAmount);
        assertEq(feeRecipient.balance, feeRecipientBalanceBefore + expectedFee);

        // Verify listing is inactive
        (, , , , bool active) = marketplace.listings(0);
        assertFalse(active);
    }

    function testCancelListing() public {
        uint256 listingAmount = 100 * 10 ** 18;

        // Setup listing
        vm.startPrank(seller);
        token.approve(address(marketplace), listingAmount);
        marketplace.listToken{ value: LISTING_FEE }(address(token), listingAmount, TOKEN_PRICE);

        uint256 sellerBalanceBefore = token.balanceOf(seller);

        // Cancel listing
        marketplace.cancelListing(0);
        vm.stopPrank();

        // Verify tokens returned
        assertEq(token.balanceOf(seller), sellerBalanceBefore + listingAmount);

        // Verify listing is inactive
        (, , , , bool active) = marketplace.listings(0);
        assertFalse(active);
    }

    function testCannotBuyInactiveListing() public {
        uint256 listingAmount = 100 * 10 ** 18;
        uint256 totalPrice = (TOKEN_PRICE * listingAmount) / 1e18;

        // Setup and cancel listing
        vm.startPrank(seller);
        token.approve(address(marketplace), listingAmount);
        marketplace.listToken{ value: LISTING_FEE }(address(token), listingAmount, TOKEN_PRICE);
        marketplace.cancelListing(0);
        vm.stopPrank();

        // Try to buy cancelled listing
        vm.prank(buyer);
        vm.expectRevert('Listing inactive');
        marketplace.buyToken{ value: totalPrice }(0);
    }

    function testCannotBuyWithIncorrectPayment() public {
        uint256 listingAmount = 100 * 10 ** 18;

        // Setup listing
        vm.startPrank(seller);
        token.approve(address(marketplace), listingAmount);
        marketplace.listToken{ value: LISTING_FEE }(address(token), listingAmount, TOKEN_PRICE);
        vm.stopPrank();

        // Try to buy with wrong amount
        vm.prank(buyer);
        vm.expectRevert('Incorrect ETH amount');
        marketplace.buyToken{ value: 0.5 ether }(0);
    }

    function testOnlySellerOrOwnerCanCancel() public {
        uint256 listingAmount = 100 * 10 ** 18;

        // Setup listing
        vm.startPrank(seller);
        token.approve(address(marketplace), listingAmount);
        marketplace.listToken{ value: LISTING_FEE }(address(token), listingAmount, TOKEN_PRICE);
        vm.stopPrank();

        // Try to cancel as non-owner/non-seller
        vm.prank(buyer);
        vm.expectRevert('Not authorized');
        marketplace.cancelListing(0);
    }

    function testOwnerCanCancelAnyListing() public {
        uint256 listingAmount = 100 * 10 ** 18;

        // Setup listing
        vm.startPrank(seller);
        token.approve(address(marketplace), listingAmount);
        marketplace.listToken{ value: LISTING_FEE }(address(token), listingAmount, TOKEN_PRICE);
        vm.stopPrank();

        // Owner cancels listing
        marketplace.cancelListing(0);

        // Verify listing is inactive
        (, , , , bool active) = marketplace.listings(0);
        assertFalse(active);
    }

    function testCannotListWithoutFee() public {
        uint256 listingAmount = 100 * 10 ** 18;

        vm.startPrank(seller);
        token.approve(address(marketplace), listingAmount);

        vm.expectRevert('Insufficient listing fee');
        marketplace.listToken(address(token), listingAmount, TOKEN_PRICE);
        vm.stopPrank();
    }

    function testSetTransactionFeePercentage() public {
        uint256 newFee = 500; // 5%

        marketplace.setTransactionFeePercentage(newFee);

        assertEq(marketplace.transactionFeePercentage(), newFee);
    }

    function testCannotSetFeeAboveMax() public {
        vm.expectRevert('Fee too high');
        marketplace.setTransactionFeePercentage(1001); // > 10%
    }

    function testSetListingFee() public {
        uint256 newFee = 0.002 ether;

        marketplace.setListingFee(newFee);

        assertEq(marketplace.listingFee(), newFee);
    }

    function testSetFeeRecipient() public {
        address newRecipient = address(0x888);

        marketplace.setFeeRecipient(newRecipient);

        assertEq(marketplace.feeRecipient(), newRecipient);
    }
}
