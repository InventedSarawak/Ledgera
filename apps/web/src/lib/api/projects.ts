import axiosInstance from '@/utils/axios'
import { Project, PaginatedResponse } from '@/lib/types'

export interface CreateProjectData {
    title: string
    description: string
    locationPolygon: string
    area: number
    carbonAmount: number
    pricePerTonne: number
    image: File
    auditReport: File
}

export interface UpdateProjectData {
    title?: string
    description?: string
    locationPolygon?: string
    area?: number
    carbonAmount?: number
    pricePerTonne?: number
    image?: File
    auditReport?: File
}

export interface ListProjectsParams {
    page?: number
    limit?: number
}

/**
 * Create a new project
 */
export async function createProject(data: CreateProjectData): Promise<Project> {
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('description', data.description)
    formData.append('locationPolygon', data.locationPolygon)
    formData.append('area', data.area.toString())
    formData.append('carbonAmount', data.carbonAmount.toString())
    formData.append('pricePerTonne', data.pricePerTonne.toString())
    formData.append('image', data.image)
    formData.append('auditReport', data.auditReport)

    const response = await axiosInstance.post('/projects', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
}

/**
 * Get user's projects
 */
export async function getMyProjects(params: ListProjectsParams = {}): Promise<PaginatedResponse<Project>> {
    const { page = 1, limit = 20 } = params
    const response = await axiosInstance.get(`/projects/mine?page=${page}&limit=${limit}`)

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
 * Get projects pending review (Admin only)
 */
export async function getProjectsForReview(params: ListProjectsParams = {}): Promise<PaginatedResponse<Project>> {
    const { page = 1, limit = 20 } = params
    const response = await axiosInstance.get(`/projects/review?page=${page}&limit=${limit}`)

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
 * Get a specific project by ID
 */
export async function getProject(id: string): Promise<Project> {
    const response = await axiosInstance.get(`/projects/${id}`)
    return response.data
}

/**
 * Update a project
 */
export async function updateProject(id: string, data: UpdateProjectData): Promise<Project> {
    const formData = new FormData()
    if (data.title) formData.append('title', data.title)
    if (data.description) formData.append('description', data.description)
    if (data.locationPolygon) formData.append('locationPolygon', data.locationPolygon)
    if (data.area) formData.append('area', data.area.toString())
    if (data.carbonAmount) formData.append('carbonAmount', data.carbonAmount.toString())
    if (data.pricePerTonne) formData.append('pricePerTonne', data.pricePerTonne.toString())
    if (data.image) formData.append('image', data.image)
    if (data.auditReport) formData.append('auditReport', data.auditReport)

    const response = await axiosInstance.patch(`/projects/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<void> {
    await axiosInstance.delete(`/projects/${id}`)
}

/**
 * Submit project for review
 */
export async function submitProject(id: string): Promise<void> {
    await axiosInstance.post(`/projects/${id}/submit`)
}

/**
 * Approve project (Admin only)
 */
export async function approveProject(id: string): Promise<void> {
    await axiosInstance.post(`/projects/${id}/approve`)
}

/**
 * Reject project (Admin only)
 */
export async function rejectProject(id: string): Promise<void> {
    await axiosInstance.post(`/projects/${id}/reject`)
}

/**
 * Mint tokens for a project (Admin only)
 */
export async function mintTokens(projectId: string, amount: number, toAddress: string): Promise<void> {
    await axiosInstance.post(`/marketplace/tokens/${projectId}/mint`, {
        amount,
        toAddress
    })
}

export interface ProjectRegion {
    id: string
    title: string
    locationPolygon: [number, number][]
}

/**
 * Get approved/deployed project regions for map overlay
 */
export async function getApprovedRegions(token: string, excludeProjectId?: string): Promise<ProjectRegion[]> {
    const params = excludeProjectId ? `?excludeProjectId=${excludeProjectId}` : ''
    const response = await axiosInstance.get(`/projects/regions${params}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
}
