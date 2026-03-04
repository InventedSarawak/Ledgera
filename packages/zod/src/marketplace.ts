import { z } from 'zod'

// ============================================================================
// Marketplace Listing Schemas
// ============================================================================

export const CreateListingSchema = z.object({
    projectId: z.string().uuid('Invalid project ID'),
    tokenId: z.number().int().nonnegative('Invalid token ID'),
    amount: z.number().positive('Amount must be greater than 0'),
    priceEth: z.number().positive('Price must be greater than 0')
})

export const BuyListingSchema = z.object({
    listingId: z.string().uuid('Invalid listing ID'),
    sourceLotId: z.number().int().nonnegative().optional()
})

export const CancelListingSchema = z.object({
    listingId: z.string().uuid('Invalid listing ID')
})

export const GetListingSchema = z.object({
    listingId: z.string().uuid('Invalid listing ID')
})

export const ListMarketplaceSchema = z.object({
    page: z.number().int().positive().optional().default(1),
    limit: z.number().int().positive().max(100).optional().default(20),
    projectId: z.string().uuid().optional(),
    active: z.boolean().optional()
})

export const ListingSchema = z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    sellerId: z.string(),
    tokenId: z.number().int().nonnegative(),
    scaledAmount: z.number().int().nonnegative(),
    priceEth: z.number(),
    active: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
})

export const ListingWithDetailsSchema = ListingSchema.extend({
    projectTitle: z.string(),
    sellerEmail: z.string().email(),
    tokenAddress: z.string(),
    tokenSymbol: z.string()
})

// ============================================================================
// Token Minting Schemas
// ============================================================================

export const MintTokenSchema = z.object({
    projectId: z.string().uuid('Invalid project ID'),
    amount: z.number().positive('Amount must be greater than 0'),
    toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
})

export const DeployProjectTokenSchema = z.object({
    projectId: z.string().uuid('Invalid project ID')
})

// ============================================================================
// Type Exports
// ============================================================================

export type CreateListing = z.infer<typeof CreateListingSchema>
export type BuyListing = z.infer<typeof BuyListingSchema>
export type CancelListing = z.infer<typeof CancelListingSchema>
export type GetListing = z.infer<typeof GetListingSchema>
export type ListMarketplace = z.infer<typeof ListMarketplaceSchema>
export type Listing = z.infer<typeof ListingSchema>
export type ListingWithDetails = z.infer<typeof ListingWithDetailsSchema>
export type MintToken = z.infer<typeof MintTokenSchema>
export type DeployProjectToken = z.infer<typeof DeployProjectTokenSchema>
