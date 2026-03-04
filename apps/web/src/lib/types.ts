export interface Project {
    id: string
    supplierId: string
    title: string
    description: string
    locationLat: number
    locationLng: number
    area: number
    imageUrl: string
    auditReportUrl?: string
    carbonAmount: number
    pricePerTonne: number
    supplierEmail?: string
    status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'DEPLOYED' | 'REJECTED'
    createdAt: string
    updatedAt: string
    contractAddress?: string
    tokenSymbol?: string
}

export interface MarketplaceListing {
    id: string
    projectId: string
    sellerId: string
    tokenId: number
    scaledAmount: number
    priceEth: number
    active: boolean
    createdAt: string
    updatedAt: string
}

export interface ListingWithDetails extends MarketplaceListing {
    projectTitle: string
    projectDescription: string
    projectImageUrl: string
    sellerEmail: string
    tokenAddress: string | null
    tokenSymbol: string | null
    sellerWalletAddress: string | null
}

export interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    limit: number
}

export interface ApiErrorResponse {
    message: string
    error?: string
    statusCode?: number
    code?: string
}

export interface Purchase {
    id: string
    buyerId: string
    listingId: string
    projectId: string
    sellerId: string
    tokenId: number
    scaledAmount: number
    priceEth: number
    totalEth: number
    txHash: string
    createdAt: string
}

export interface PurchaseWithDetails extends Purchase {
    projectTitle: string
    tokenSymbol: string | null
    tokenAddress: string | null
}
