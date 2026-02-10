import { initContract } from '@ts-rest/core'
import { z } from 'zod'
import { getSecurityMetadata, getPaginationHeadersMetadata } from '../utils.js'

const c = initContract()
const metadata = getSecurityMetadata()

// Schemas
export const ZListing = z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    sellerId: z.string(),
    amount: z.number(),
    priceEth: z.number(),
    active: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
})

export const ZListingWithDetails = ZListing.extend({
    projectTitle: z.string(),
    sellerEmail: z.string().email(),
    tokenAddress: z.string(),
    tokenSymbol: z.string()
})

export const ZCreateListingBody = z.object({
    projectId: z.string().uuid(),
    amount: z.number().positive(),
    priceEth: z.number().positive()
})

export const ZMintTokenBody = z.object({
    amount: z.number().positive(),
    toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
})

// Contract
export const marketplaceContract = c.router({
    // Create Listing
    createListing: {
        method: 'POST',
        path: '/api/v1/marketplace/listings',
        summary: 'Create a new marketplace listing',
        description: 'Create a new marketplace listing for selling carbon credit tokens',
        body: ZCreateListingBody,
        responses: {
            201: ZListing,
            400: z.object({ error: z.string() }),
            401: z.object({ error: z.string() })
        },
        metadata: metadata
    },

    // List Active Listings
    listActiveListings: {
        method: 'GET',
        path: '/api/v1/marketplace',
        summary: 'List active marketplace listings',
        description: 'Get all active marketplace listings with pagination',
        query: z.object({
            page: z.coerce.number().int().positive().optional(),
            limit: z.coerce.number().int().positive().max(100).optional(),
            projectId: z.string().uuid().optional(),
            active: z.coerce.boolean().optional()
        }),
        responses: {
            200: z.array(ZListingWithDetails),
            400: z.object({ error: z.string() })
        },
        metadata: getPaginationHeadersMetadata()
    },

    // Get Listing by ID
    getListing: {
        method: 'GET',
        path: '/api/v1/marketplace/:id',
        summary: 'Get a marketplace listing',
        description: 'Get a specific marketplace listing by ID',
        pathParams: z.object({
            id: z.string().uuid()
        }),
        responses: {
            200: ZListing,
            404: z.object({ error: z.string() })
        }
    },

    // Buy Listing
    buyListing: {
        method: 'POST',
        path: '/api/v1/marketplace/listings/:id/buy',
        summary: 'Purchase a marketplace listing',
        description: 'Purchase carbon credit tokens from a marketplace listing',
        pathParams: z.object({
            id: z.string().uuid()
        }),
        body: z.object({}),
        responses: {
            200: z.object({ message: z.string() }),
            400: z.object({ error: z.string() }),
            401: z.object({ error: z.string() }),
            404: z.object({ error: z.string() })
        },
        metadata: metadata
    },

    // Cancel Listing
    cancelListing: {
        method: 'DELETE',
        path: '/api/v1/marketplace/listings/:id',
        summary: 'Cancel a marketplace listing',
        description: 'Cancel a marketplace listing (seller only)',
        pathParams: z.object({
            id: z.string().uuid()
        }),
        responses: {
            204: z.void(),
            401: z.object({ error: z.string() }),
            403: z.object({ error: z.string() }),
            404: z.object({ error: z.string() })
        },
        metadata: metadata
    },

    // Mint Tokens (Admin Only)
    mintTokens: {
        method: 'POST',
        path: '/api/v1/marketplace/tokens/:id/mint',
        summary: 'Mint carbon credit tokens',
        description: 'Mint new carbon credit tokens for a project (admin only)',
        pathParams: z.object({
            id: z.string().uuid()
        }),
        body: ZMintTokenBody,
        responses: {
            200: z.object({ message: z.string() }),
            400: z.object({ error: z.string() }),
            401: z.object({ error: z.string() }),
            403: z.object({ error: z.string() }),
            404: z.object({ error: z.string() })
        },
        metadata: { ...metadata, description: 'Admin only endpoint' }
    }
})
