// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from 'forge-std/Test.sol';
import {AssetToken} from '../src/AssetToken.sol';

contract AssetTokenTest is Test {
    AssetToken public token;

    address owner = address(this);
    address alice = address(0x1);
    address bob = address(0x2);
    address charlie = address(0x3);

    function setUp() public {
        token = new AssetToken('Carbon Credit', 'CC', owner);
    }

    // ── Basic State ─────────────────────────────────────────────────────

    function testInitialState() public view {
        assertEq(token.name(), 'Carbon Credit');
        assertEq(token.symbol(), 'CC');
        assertEq(token.owner(), owner);
        assertEq(token.nextLotId(), 1);
    }

    function testScalingFactor() public view {
        assertEq(token.SCALING_FACTOR(), 1000);
    }

    // ── Mint Initial Supply ─────────────────────────────────────────────

    function testMintInitialSupply() public {
        uint256 amount = 10_000; // 10.000 credits

        token.mintInitialSupply(alice, amount);

        assertEq(token.balanceOf(alice, 0), amount);

        (
            address origProject,
            uint256 lotAmount,
            ,
            bool isAbleToBuy,
            address currentOwner,
            uint256 parentLotId
        ) = token.getLotDetails(0);

        assertEq(origProject, address(token));
        assertEq(lotAmount, amount);
        assertTrue(isAbleToBuy);
        assertEq(currentOwner, alice);
        assertEq(parentLotId, 0);
    }

    function testMintInitialSupplyAccumulates() public {
        token.mintInitialSupply(alice, 5_000);
        token.mintInitialSupply(alice, 3_000);

        assertEq(token.balanceOf(alice, 0), 8_000);
        (, uint256 lotAmount, , , , ) = token.getLotDetails(0);
        assertEq(lotAmount, 8_000);
    }

    function testOnlyOwnerCanMintInitialSupply() public {
        vm.prank(alice);
        vm.expectRevert();
        token.mintInitialSupply(alice, 1000);
    }

    // ── Purchase Lot ────────────────────────────────────────────────────

    function testPurchaseCreatesNewLotId() public {
        token.mintInitialSupply(alice, 10_000);

        uint256 newLotId = token.purchaseLot(0, 5_000, bob);

        assertEq(newLotId, 1);
        assertEq(token.nextLotId(), 2);

        // Bob's new lot
        assertEq(token.balanceOf(bob, 1), 5_000);
        (
            address origProject,
            uint256 lotAmount,
            ,
            bool isAbleToBuy,
            address currentOwner,
            uint256 parentLotId
        ) = token.getLotDetails(1);
        assertEq(origProject, address(token));
        assertEq(lotAmount, 5_000);
        assertFalse(isAbleToBuy); // not listed by default
        assertEq(currentOwner, bob);
        assertEq(parentLotId, 0);

        // Alice's lot 0 reduced
        assertEq(token.balanceOf(alice, 0), 5_000);
        (, uint256 remaining, , bool stillForSale, , ) = token.getLotDetails(0);
        assertEq(remaining, 5_000);
        assertTrue(stillForSale); // still has balance
    }

    function testMultiplePurchasesDistinctLots() public {
        token.mintInitialSupply(alice, 30_000);

        // Bob buys 10 credits (10_000 scaled)
        uint256 lot1 = token.purchaseLot(0, 10_000, bob);
        // Bob buys 20 credits (20_000 scaled)
        uint256 lot2 = token.purchaseLot(0, 20_000, bob);

        assertEq(lot1, 1);
        assertEq(lot2, 2);

        // Bob has two distinct lots
        assertEq(token.balanceOf(bob, 1), 10_000);
        assertEq(token.balanceOf(bob, 2), 20_000);

        // Alice's lot 0 is empty
        assertEq(token.balanceOf(alice, 0), 0);
        (, , , bool isAbleToBuy, , ) = token.getLotDetails(0);
        assertFalse(isAbleToBuy); // depleted = delisted
    }

    function testPartialPurchaseFromLot() public {
        token.mintInitialSupply(alice, 10_000);

        // Buy 3.5 credits
        token.purchaseLot(0, 3_500, bob);

        assertEq(token.balanceOf(alice, 0), 6_500);
        assertEq(token.balanceOf(bob, 1), 3_500);

        (, uint256 sourceRemaining, , bool sourceForSale, , ) = token.getLotDetails(0);
        assertEq(sourceRemaining, 6_500);
        assertTrue(sourceForSale);
    }

    function testCannotPurchaseUnlistedLot() public {
        token.mintInitialSupply(alice, 10_000);
        uint256 lot1 = token.purchaseLot(0, 5_000, bob);

        // Lot 1 is not listed (isAbleToBuy == false)
        vm.expectRevert('Lot not for sale');
        token.purchaseLot(lot1, 2_000, charlie);
    }

    function testCannotPurchaseMoreThanAvailable() public {
        token.mintInitialSupply(alice, 5_000);

        vm.expectRevert('Insufficient lot balance');
        token.purchaseLot(0, 10_000, bob);
    }

    function testCannotPurchaseZero() public {
        token.mintInitialSupply(alice, 5_000);

        vm.expectRevert('Amount must be > 0');
        token.purchaseLot(0, 0, bob);
    }

    function testOnlyOwnerCanPurchaseLot() public {
        token.mintInitialSupply(alice, 10_000);

        vm.prank(bob);
        vm.expectRevert();
        token.purchaseLot(0, 5_000, bob);
    }

    // ── Certificate Event ───────────────────────────────────────────────

    function testCertificateGeneratedEvent() public {
        token.mintInitialSupply(alice, 10_000);

        vm.expectEmit(true, true, true, true);
        emit AssetToken.CertificateGenerated(1, alice, bob, 5_000, block.timestamp);

        token.purchaseLot(0, 5_000, bob);
    }

    // ── List / Delist ───────────────────────────────────────────────────

    function testListForSale() public {
        token.mintInitialSupply(alice, 10_000);
        token.purchaseLot(0, 5_000, bob);

        // Bob lists lot 1
        vm.prank(bob);
        token.listForSale(1, 0.01 ether);

        (, , uint256 price, bool isAbleToBuy, , ) = token.getLotDetails(1);
        assertTrue(isAbleToBuy);
        assertEq(price, 0.01 ether);
    }

    function testDelistFromSale() public {
        token.mintInitialSupply(alice, 10_000);
        token.purchaseLot(0, 5_000, bob);

        vm.startPrank(bob);
        token.listForSale(1, 0.01 ether);
        token.delistFromSale(1);
        vm.stopPrank();

        (, , , bool isAbleToBuy, , ) = token.getLotDetails(1);
        assertFalse(isAbleToBuy);
    }

    function testNonOwnerCannotList() public {
        token.mintInitialSupply(alice, 10_000);
        token.purchaseLot(0, 5_000, bob);

        vm.prank(charlie);
        vm.expectRevert('Not lot owner');
        token.listForSale(1, 0.01 ether);
    }

    function testNonOwnerCannotDelist() public {
        token.mintInitialSupply(alice, 10_000);
        token.purchaseLot(0, 5_000, bob);

        vm.prank(bob);
        token.listForSale(1, 0.01 ether);

        vm.prank(charlie);
        vm.expectRevert('Not lot owner');
        token.delistFromSale(1);
    }

    function testCannotListWithZeroPrice() public {
        token.mintInitialSupply(alice, 10_000);
        token.purchaseLot(0, 5_000, bob);

        vm.prank(bob);
        vm.expectRevert('Price must be > 0');
        token.listForSale(1, 0);
    }

    function testLotListedEvent() public {
        token.mintInitialSupply(alice, 10_000);
        token.purchaseLot(0, 5_000, bob);

        vm.prank(bob);
        vm.expectEmit(true, false, false, true);
        emit AssetToken.LotListed(1, 5_000, 0.01 ether);
        token.listForSale(1, 0.01 ether);
    }

    function testLotDelistedEvent() public {
        token.mintInitialSupply(alice, 10_000);
        token.purchaseLot(0, 5_000, bob);

        vm.startPrank(bob);
        token.listForSale(1, 0.01 ether);

        vm.expectEmit(true, false, false, false);
        emit AssetToken.LotDelisted(1);
        token.delistFromSale(1);
        vm.stopPrank();
    }

    // ── Resale Flow ─────────────────────────────────────────────────────

    function testResaleCreatesNewLot() public {
        // Alice mints, Bob buys, Bob lists, Charlie buys from Bob
        token.mintInitialSupply(alice, 10_000);
        uint256 bobLot = token.purchaseLot(0, 5_000, bob);

        // Bob lists for resale
        vm.prank(bob);
        token.listForSale(bobLot, 0.02 ether);

        // Charlie buys 2_000 from Bob's lot
        uint256 charlieLot = token.purchaseLot(bobLot, 2_000, charlie);

        // Verify chain of custody
        assertEq(charlieLot, 2);
        assertEq(token.balanceOf(charlie, 2), 2_000);
        assertEq(token.balanceOf(bob, 1), 3_000);

        (, , , , , uint256 parentId) = token.getLotDetails(charlieLot);
        assertEq(parentId, bobLot); // Parent is Bob's lot
    }

    function testFullResaleChain() public {
        // Alice -> Bob -> Charlie, complete depletion
        token.mintInitialSupply(alice, 5_000);
        uint256 bobLot = token.purchaseLot(0, 5_000, bob);

        vm.prank(bob);
        token.listForSale(bobLot, 0.02 ether);

        uint256 charlieLot = token.purchaseLot(bobLot, 5_000, charlie);

        // Bob's lot is depleted and delisted
        (, uint256 bobRemaining, , bool bobForSale, , ) = token.getLotDetails(bobLot);
        assertEq(bobRemaining, 0);
        assertFalse(bobForSale);

        // Charlie has the full amount
        assertEq(token.balanceOf(charlie, charlieLot), 5_000);
    }

    // ── Fuzz Tests ──────────────────────────────────────────────────────

    function testFuzz_MintAndPurchase(uint256 mintAmount, uint256 buyAmount) public {
        // Bound to reasonable ranges (1 to 1_000_000 credits scaled)
        mintAmount = bound(mintAmount, 1, 1_000_000_000);
        buyAmount = bound(buyAmount, 1, mintAmount);

        token.mintInitialSupply(alice, mintAmount);
        uint256 newLotId = token.purchaseLot(0, buyAmount, bob);

        assertEq(token.balanceOf(bob, newLotId), buyAmount);
        assertEq(token.balanceOf(alice, 0), mintAmount - buyAmount);

        (, uint256 sourceRemaining, , , , ) = token.getLotDetails(0);
        assertEq(sourceRemaining, mintAmount - buyAmount);

        (, uint256 newLotAmount, , , , ) = token.getLotDetails(newLotId);
        assertEq(newLotAmount, buyAmount);
    }

    function testFuzz_MultiplePurchasesPreserveTotal(
        uint256 buy1,
        uint256 buy2,
        uint256 buy3
    ) public {
        uint256 totalSupply = 1_000_000;
        buy1 = bound(buy1, 1, totalSupply / 3);
        buy2 = bound(buy2, 1, totalSupply / 3);
        buy3 = bound(buy3, 1, totalSupply - buy1 - buy2);

        token.mintInitialSupply(alice, totalSupply);
        token.purchaseLot(0, buy1, bob);
        token.purchaseLot(0, buy2, charlie);
        token.purchaseLot(0, buy3, address(0x4));

        // All tokens accounted for
        uint256 remaining = token.balanceOf(alice, 0);
        uint256 bobBal = token.balanceOf(bob, 1);
        uint256 charlieBal = token.balanceOf(charlie, 2);
        uint256 fourthBal = token.balanceOf(address(0x4), 3);

        assertEq(remaining + bobBal + charlieBal + fourthBal, totalSupply);
    }

    function testFuzz_ListAndDelist(uint256 price) public {
        price = bound(price, 1, 100 ether);

        token.mintInitialSupply(alice, 10_000);
        token.purchaseLot(0, 5_000, bob);

        vm.startPrank(bob);
        token.listForSale(1, price);

        (, , uint256 storedPrice, bool listed, , ) = token.getLotDetails(1);
        assertEq(storedPrice, price);
        assertTrue(listed);

        token.delistFromSale(1);
        (, , , bool delisted, , ) = token.getLotDetails(1);
        assertFalse(delisted);
        vm.stopPrank();
    }

    function testFuzz_ResaleChain(uint256 initialAmount, uint256 firstBuy, uint256 resaleAmount) public {
        initialAmount = bound(initialAmount, 2, 1_000_000);
        firstBuy = bound(firstBuy, 1, initialAmount);
        resaleAmount = bound(resaleAmount, 1, firstBuy);

        token.mintInitialSupply(alice, initialAmount);
        uint256 bobLot = token.purchaseLot(0, firstBuy, bob);

        vm.prank(bob);
        token.listForSale(bobLot, 0.01 ether);

        uint256 charlieLot = token.purchaseLot(bobLot, resaleAmount, charlie);

        assertEq(token.balanceOf(charlie, charlieLot), resaleAmount);
        assertEq(token.balanceOf(bob, bobLot), firstBuy - resaleAmount);

        (, , , , , uint256 parentId) = token.getLotDetails(charlieLot);
        assertEq(parentId, bobLot);
    }
}
