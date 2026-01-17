// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import 'forge-std/Test.sol';
import '../src/Counter.sol';

contract CounterTest is Test {
    Counter public counter;
    address public owner;
    address public user1;
    address public user2;

    event CounterIncremented(address indexed user, uint256 newCount);
    event CounterDecremented(address indexed user, uint256 newCount);
    event CounterReset(address indexed user);

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        
        counter = new Counter();
    }

    function testInitialState() public view {
        assertEq(counter.getCount(), 0, 'Initial count should be 0');
        assertEq(counter.getOwner(), owner, 'Owner should be deployer');
    }

    function testIncrement() public {
        vm.expectEmit(true, false, false, true);
        emit CounterIncremented(address(this), 1);
        
        counter.increment();
        assertEq(counter.getCount(), 1, 'Count should be 1 after increment');
        
        counter.increment();
        assertEq(counter.getCount(), 2, 'Count should be 2 after second increment');
    }

    function testIncrementAsUser() public {
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit CounterIncremented(user1, 1);
        
        counter.increment();
        assertEq(counter.getCount(), 1, 'Count should be 1');
        
        vm.prank(user2);
        counter.increment();
        assertEq(counter.getCount(), 2, 'Count should be 2');
    }

    function testDecrement() public {
        counter.increment();
        counter.increment();
        
        vm.expectEmit(true, false, false, true);
        emit CounterDecremented(address(this), 1);
        
        counter.decrement();
        assertEq(counter.getCount(), 1, 'Count should be 1 after decrement');
    }

    function testDecrementUnderflow() public {
        vm.expectRevert(Counter.CounterUnderflow.selector);
        counter.decrement();
    }

    function testDecrementAsUser() public {
        counter.increment();
        counter.increment();
        
        vm.prank(user1);
        counter.decrement();
        assertEq(counter.getCount(), 1, 'Count should be 1');
    }

    function testReset() public {
        counter.increment();
        counter.increment();
        counter.increment();
        
        vm.expectEmit(true, false, false, true);
        emit CounterReset(address(this));
        
        counter.reset();
        assertEq(counter.getCount(), 0, 'Count should be 0 after reset');
    }

    function testResetUnauthorized() public {
        counter.increment();
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(Counter.UnauthorizedAccess.selector, user1));
        counter.reset();
        
        assertEq(counter.getCount(), 1, 'Count should remain unchanged');
    }

    function testFuzzIncrement(uint8 iterations) public {
        for (uint256 i = 0; i < iterations; i++) {
            counter.increment();
        }
        assertEq(counter.getCount(), iterations, 'Count should match iterations');
    }

    function testFuzzIncrementDecrement(uint8 increments, uint8 decrements) public {
        vm.assume(decrements <= increments);
        
        for (uint256 i = 0; i < increments; i++) {
            counter.increment();
        }
        
        for (uint256 i = 0; i < decrements; i++) {
            counter.decrement();
        }
        
        assertEq(counter.getCount(), increments - decrements, 'Count should match difference');
    }

    function testMultipleUsersInteraction() public {
        vm.prank(user1);
        counter.increment();
        
        vm.prank(user2);
        counter.increment();
        
        counter.increment();
        
        assertEq(counter.getCount(), 3, 'Count should be 3');
        
        vm.prank(user1);
        counter.decrement();
        
        assertEq(counter.getCount(), 2, 'Count should be 2');
    }
}
