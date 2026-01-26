export interface Project {
    id: string
    title: string
    description: string
    locationLat: number
    locationLng: number
    area: number
    imageUrl: string
    status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'DEPLOYED' | 'REJECTED'
    createdAt: string
    contractAddress?: string
    tokenSymbol?: string
}

export interface ApiErrorResponse {
    message: string
    error?: string
    statusCode?: number
}
