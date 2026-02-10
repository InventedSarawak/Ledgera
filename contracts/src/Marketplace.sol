// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

contract Marketplace is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Listing {
        address seller;
        address token;
        uint256 price;
        uint256 amount;
        bool active;
    }

    // Fee configuration
    uint256 public transactionFeePercentage = 250; // 2.5% in basis points (250/10000)
    uint256 public listingFee = 0.001 ether;
    address public feeRecipient;

    // Events
    event Listed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed token,
        uint256 amount,
        uint256 price
    );
    event Purchased(uint256 indexed listingId, address indexed buyer, uint256 totalPrice, uint256 platformFee);
    event Cancelled(uint256 indexed listingId);
    event TransactionFeeUpdated(uint256 newFeePercentage);
    event ListingFeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address newRecipient);

    uint256 public listingCount;
    mapping(uint256 => Listing) public listings;

    constructor(address initialOwner, address _feeRecipient) Ownable(initialOwner) {
        require(_feeRecipient != address(0), 'Invalid fee recipient');
        feeRecipient = _feeRecipient;
    }

    function listToken(address token, uint256 amount, uint256 price) external payable nonReentrant {
        require(msg.value >= listingFee, 'Insufficient listing fee');
        require(token != address(0), 'Invalid token');
        require(amount > 0, 'Amount must be > 0');
        require(price > 0, 'Price must be > 0');

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        listings[listingCount] = Listing({
            seller: msg.sender,
            token: token,
            price: price,
            amount: amount,
            active: true
        });

        // Transfer listing fee to platform
        if (msg.value > 0) {
            (bool success, ) = payable(feeRecipient).call{ value: msg.value }('');
            require(success, 'Listing fee transfer failed');
        }

        emit Listed(listingCount, msg.sender, token, amount, price);
        listingCount++;
    }

    function buyToken(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, 'Listing inactive');

        // Calculate total price: (price per token * amount) / 10^18
        // This accounts for token decimals in the amount
        uint256 totalPrice = (listing.price * listing.amount) / 1e18;
        require(msg.value == totalPrice, 'Incorrect ETH amount');

        listing.active = false;

        // Calculate platform fee
        uint256 platformFee = (totalPrice * transactionFeePercentage) / 10000;
        uint256 sellerAmount = totalPrice - platformFee;

        // Transfer tokens to buyer
        IERC20(listing.token).safeTransfer(msg.sender, listing.amount);

        // Transfer ETH to seller (minus fee)
        (bool successSeller, ) = payable(listing.seller).call{ value: sellerAmount }('');
        require(successSeller, 'Seller payment failed');

        // Transfer platform fee
        (bool successFee, ) = payable(feeRecipient).call{ value: platformFee }('');
        require(successFee, 'Fee transfer failed');

        emit Purchased(listingId, msg.sender, totalPrice, platformFee);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, 'Listing inactive');
        require(msg.sender == listing.seller || msg.sender == owner(), 'Not authorized');

        listing.active = false;

        IERC20(listing.token).safeTransfer(listing.seller, listing.amount);
        emit Cancelled(listingId);
    }

    // Admin functions
    function setTransactionFeePercentage(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 1000, 'Fee too high'); // Max 10%
        transactionFeePercentage = newFeePercentage;
        emit TransactionFeeUpdated(newFeePercentage);
    }

    function setListingFee(uint256 newFee) external onlyOwner {
        require(newFee <= 0.1 ether, 'Listing fee too high'); // Max 0.1 ETH
        listingFee = newFee;
        emit ListingFeeUpdated(newFee);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), 'Invalid address');
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }
}
