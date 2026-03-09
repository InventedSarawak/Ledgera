// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';

/**
 * @title AssetToken
 * @notice ERC-1155 carbon credit token with lot-based provenance tracking.
 *
 * Token ID 0 = initial project supply (minted by the project owner).
 * Every purchase mints a new auto-incrementing Token ID to the buyer,
 * preserving an unbroken chain of custody.
 *
 * Scaling factor: 1 whole carbon credit = 1000 units (3 decimal places).
 */
contract AssetToken is ERC1155, Ownable {
    string public name;
    string public symbol;

    /// @notice 1 whole credit = 1000 on-chain units (3 decimal places)
    uint256 public constant SCALING_FACTOR = 1000;

    /// @notice Auto-incrementing lot ID counter (starts at 1; 0 = initial supply)
    uint256 public nextLotId = 1;

    struct LotMetadata {
        address originalProject; // The contract address itself (provenance root)
        uint256 amount; // Scaled amount currently in this lot
        uint256 pricePerUnit; // Price per scaled unit in wei (set when listed)
        bool isAbleToBuy; // Whether this lot is listed for sale
        address currentOwner; // Current holder of this lot
        uint256 parentLotId; // Lot this was split/purchased from (0 = initial mint)
    }

    mapping(uint256 => LotMetadata) public lotDetails;

    // ── Events ──────────────────────────────────────────────────────────
    event CertificateGenerated(
        uint256 indexed newLotId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 scaledAmount,
        uint256 timestamp
    );
    event LotListed(uint256 indexed lotId, uint256 amount, uint256 pricePerUnit);
    event LotDelisted(uint256 indexed lotId);
    event CreditsRetired(
        uint256 indexed lotId,
        address indexed owner,
        uint256 scaledAmount,
        string reason,
        uint256 timestamp
    );

    // ── Constructor ─────────────────────────────────────────────────────
    constructor(
        string memory _name,
        string memory _symbol,
        address initialOwner
    ) ERC1155('') Ownable(initialOwner) {
        name = _name;
        symbol = _symbol;
    }

    // ── Admin functions ─────────────────────────────────────────────────

    /// @notice Mint initial supply to the project owner as Token ID 0
    /// @param to      Recipient (project owner / supplier)
    /// @param scaledAmount  Amount in scaled units (e.g. 10_000 = 10.000 credits)
    function mintInitialSupply(address to, uint256 scaledAmount) external onlyOwner {
        _mint(to, 0, scaledAmount, '');

        // If lot 0 already exists, just increase its amount
        if (lotDetails[0].currentOwner != address(0)) {
            lotDetails[0].amount += scaledAmount;
        } else {
            lotDetails[0] = LotMetadata({
                originalProject: address(this),
                amount: scaledAmount,
                pricePerUnit: 0,
                isAbleToBuy: true, // Initial supply is available
                currentOwner: to,
                parentLotId: 0
            });
        }
    }

    /// @notice Purchase from a listed lot — creates a NEW lot for the buyer.
    ///         Called by the contract owner (backend admin key) after verifying payment.
    /// @param sourceLotId  The lot being purchased from
    /// @param scaledAmount Amount in scaled units to purchase
    /// @param buyer        Address of the buyer
    /// @return newLotId    The newly created lot ID
    function purchaseLot(
        uint256 sourceLotId,
        uint256 scaledAmount,
        address buyer
    ) external onlyOwner returns (uint256 newLotId) {
        LotMetadata storage source = lotDetails[sourceLotId];
        // require(source.isAbleToBuy, 'Lot not for sale'); // Removed: Handled by off-chain backend
        require(source.amount >= scaledAmount, 'Insufficient lot balance');
        require(
            balanceOf(source.currentOwner, sourceLotId) >= scaledAmount,
            'Owner balance mismatch'
        );
        require(scaledAmount > 0, 'Amount must be > 0');

        address previousOwner = source.currentOwner;

        // Burn from source owner
        _burn(previousOwner, sourceLotId, scaledAmount);
        source.amount -= scaledAmount;

        // If source lot is fully depleted, mark not for sale
        if (source.amount == 0) {
            source.isAbleToBuy = false;
        }

        // Mint new lot for buyer
        newLotId = nextLotId++;
        _mint(buyer, newLotId, scaledAmount, '');

        lotDetails[newLotId] = LotMetadata({
            originalProject: address(this),
            amount: scaledAmount,
            pricePerUnit: 0,
            isAbleToBuy: false, // Buyer must explicitly list for resale
            currentOwner: buyer,
            parentLotId: sourceLotId
        });

        emit CertificateGenerated(
            newLotId,
            previousOwner,
            buyer,
            scaledAmount,
            block.timestamp
        );

        return newLotId;
    }

    // ── User functions ──────────────────────────────────────────────────

    /// @notice List a lot for resale on the marketplace
    /// @param lotId        The lot to list
    /// @param pricePerUnit Price per scaled unit in wei
    function listForSale(uint256 lotId, uint256 pricePerUnit) external {
        require(balanceOf(msg.sender, lotId) > 0, 'Not lot owner');
        require(lotDetails[lotId].currentOwner == msg.sender, 'Not lot owner');
        require(pricePerUnit > 0, 'Price must be > 0');

        lotDetails[lotId].isAbleToBuy = true;
        lotDetails[lotId].pricePerUnit = pricePerUnit;

        emit LotListed(lotId, lotDetails[lotId].amount, pricePerUnit);
    }

    /// @notice Remove a lot from the marketplace
    /// @param lotId The lot to delist
    function delistFromSale(uint256 lotId) external {
        require(lotDetails[lotId].currentOwner == msg.sender, 'Not lot owner');

        lotDetails[lotId].isAbleToBuy = false;

        emit LotDelisted(lotId);
    }

    /// @notice View helper: get full lot metadata
    function getLotDetails(
        uint256 lotId
    )
        external
        view
        returns (
            address originalProject,
            uint256 amount,
            uint256 pricePerUnit,
            bool isAbleToBuy,
            address currentOwner,
            uint256 parentLotId
        )
    {
        LotMetadata storage lot = lotDetails[lotId];
        return (
            lot.originalProject,
            lot.amount,
            lot.pricePerUnit,
            lot.isAbleToBuy,
            lot.currentOwner,
            lot.parentLotId
        );
    }

    /// @notice Retire (burn) credits from a lot — permanently offsets emissions.
    ///         Called by the contract owner (backend admin key) on behalf of the lot owner.
    /// @param lotId         The lot to retire from
    /// @param scaledAmount  Amount in scaled units to retire
    /// @param ownerAddr     Address of the lot owner
    /// @param reason        Human-readable retirement reason
    function retireCredits(
        uint256 lotId,
        uint256 scaledAmount,
        address ownerAddr,
        string calldata reason
    ) external onlyOwner {
        LotMetadata storage lot = lotDetails[lotId];
        require(lot.currentOwner == ownerAddr, 'Not lot owner');
        require(lot.amount >= scaledAmount, 'Insufficient lot balance');
        require(
            balanceOf(ownerAddr, lotId) >= scaledAmount,
            'Owner balance mismatch'
        );
        require(scaledAmount > 0, 'Amount must be > 0');

        // Burn the tokens
        _burn(ownerAddr, lotId, scaledAmount);
        lot.amount -= scaledAmount;

        // If lot is fully depleted, mark not for sale
        if (lot.amount == 0) {
            lot.isAbleToBuy = false;
        }

        emit CreditsRetired(
            lotId,
            ownerAddr,
            scaledAmount,
            reason,
            block.timestamp
        );
    }
}
