// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Counter {
    uint256 private _count;
    address private _owner;

    event CounterIncremented(address indexed user, uint256 newCount);
    event CounterDecremented(address indexed user, uint256 newCount);
    event CounterReset(address indexed user);

    error UnauthorizedAccess(address caller);
    error CounterUnderflow();

    modifier onlyOwner() {
        if (msg.sender != _owner) {
            revert UnauthorizedAccess(msg.sender);
        }
        _;
    }

    constructor() {
        _owner = msg.sender;
        _count = 0;
    }

    function increment() external {
        _count += 1;
        emit CounterIncremented(msg.sender, _count);
    }

    function decrement() external {
        if (_count == 0) {
            revert CounterUnderflow();
        }
        _count -= 1;
        emit CounterDecremented(msg.sender, _count);
    }

    function reset() external onlyOwner {
        _count = 0;
        emit CounterReset(msg.sender);
    }

    function getCount() external view returns (uint256) {
        return _count;
    }

    function getOwner() external view returns (address) {
        return _owner;
    }
}
