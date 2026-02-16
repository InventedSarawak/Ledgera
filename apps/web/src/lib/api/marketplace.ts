import axiosInstance from '@/utils/axios'
import { ListingWithDetails, MarketplaceListing, PaginatedResponse } from '@/lib/types'

export interface CreateListingData {
    projectId: string
    amount: number
    priceEth: number
}

export interface ListMarketplaceParams {
    page?: number
    limit?: number
    projectId?: string
    active?: boolean
}

/**
 * List all active marketplace listings
 */
export async function listMarketplaceListings(
    params: ListMarketplaceParams = {}
): Promise<PaginatedResponse<ListingWithDetails>> {
    const { page = 1, limit = 20, projectId, active } = params

    const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
    })

    if (projectId) queryParams.append('projectId', projectId)
    if (active !== undefined) queryParams.append('active', active.toString())

    const response = await axiosInstance.get(`/marketplace?${queryParams}`)

    const total = parseInt(response.headers['x-total-count'] || '0')
    const currentPage = parseInt(response.headers['x-page'] || '1')
    const currentLimit = parseInt(response.headers['x-limit'] || '20')

    return {
        data: response.data,
        total,
        page: currentPage,
        limit: currentLimit
    }
}

/**
 * Get a specific marketplace listing by ID
 */
export async function getMarketplaceListing(id: string): Promise<MarketplaceListing> {
    const response = await axiosInstance.get(`/marketplace/${id}`)
    return response.data
}

/**
 * Create a new marketplace listing
 */
export async function createMarketplaceListing(data: CreateListingData): Promise<MarketplaceListing> {
    const response = await axiosInstance.post('/marketplace/listings', data)
    return response.data
}

/**
 * Purchase a marketplace listing
 */
export async function buyMarketplaceListing(listingId: string): Promise<void> {
    await axiosInstance.post(`/marketplace/listings/${listingId}/buy`)
}

/**
 * Cancel a marketplace listing
 */
export async function cancelMarketplaceListing(listingId: string): Promise<void> {
    await axiosInstance.delete(`/marketplace/listings/${listingId}`)
}
