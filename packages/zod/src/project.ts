import { z } from 'zod'

export const ZProjectStatus = z.enum(['DRAFT', 'PENDING', 'APPROVED', 'DEPLOYED', 'REJECTED'])

export const ZProject = z.object({
    id: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    supplierId: z.string(),
    title: z.string(),
    description: z.string(),
    imageUrl: z.string().url(),
    locationLat: z.number(),
    locationLng: z.number(),
    area: z.number(),
    contractAddress: z.string().nullable().optional(),
    tokenSymbol: z.string().nullable().optional(),
    status: ZProjectStatus
})

export const ZProjectWithSupplier = ZProject.extend({
    supplierEmail: z.string().email().optional()
})

export const ZCreateProjectRequest = z.object({
    title: z.string().min(3).max(150),
    description: z.string().min(10),
    locationLat: z.coerce.number(),
    locationLng: z.coerce.number(),
    area: z.coerce.number().positive()
})

export const ZUpdateProjectRequest = z.object({
    title: z.string().min(3).max(150).optional(),
    description: z.string().min(10).optional(),
    locationLat: z.coerce.number().optional(),
    locationLng: z.coerce.number().optional(),
    area: z.coerce.number().positive().optional(),
    contractAddress: z.string().optional(),
    status: ZProjectStatus.optional()
})

export const ZProjectListResponse = z.array(ZProject)
