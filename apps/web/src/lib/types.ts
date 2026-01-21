export interface Project {
    id: string
    title: string
    description: string
    locationLat: number
    locationLng: number
    imageUrl: string
    status: 'PENDING' | 'APPROVED' | 'DEPLOYED'
    createdAt: string
    contractAddress?: string
    tokenSymbol?: string
}

export interface ApiErrorResponse {
    message: string
    error?: string
    statusCode?: number
}
