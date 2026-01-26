import { initContract } from '@ts-rest/core'
import { z } from 'zod'
import { getSecurityMetadata, getPaginationHeadersMetadata } from '../utils.js'

const c = initContract()
const metadata = getSecurityMetadata()

// Shared schemas
export const ZProjectStatus = z.enum(['DRAFT', 'PENDING', 'APPROVED', 'DEPLOYED', 'REJECTED'])

export const ZProject = z.object({
    id: z.string().uuid(),
    supplierId: z.string(),
    title: z.string(),
    description: z.string(),
    imageUrl: z.string().url(),
    locationLat: z.number(),
    locationLng: z.number(),
    area: z.number(),
    contractAddress: z.string().optional(),
    tokenSymbol: z.string().optional(),
    status: ZProjectStatus,
    createdAt: z.string(),
    updatedAt: z.string().optional()
})

// Represent file in OpenAPI via custom schema that our generator replaces to binary
const ZFile = z.object({ type: z.enum(['file']) })

export const ZCreateProjectBody = z.object({
    title: z.string().min(3).max(150),
    description: z.string().min(10),
    locationLat: z.number(),
    locationLng: z.number(),
    area: z.number().gt(0),
    image: ZFile
})

export const ZUpdateProjectBody = z.object({
    title: z.string().min(3).max(150).optional(),
    description: z.string().min(10).optional(),
    locationLat: z.number().optional(),
    locationLng: z.number().optional(),
    area: z.number().gt(0).optional(),
    contractAddress: z.string().optional(),
    status: ZProjectStatus.optional(),
    image: ZFile.optional()
})

export const projectContract = c.router({
    create: {
        summary: 'Create Project',
        path: '/projects',
        method: 'POST',
        contentType: 'multipart/form-data',
        body: ZCreateProjectBody,
        responses: {
            201: ZProject
        },
        metadata
    },
    listMine: {
        summary: 'List My Projects',
        path: '/projects/mine',
        method: 'GET',
        query: z.object({
            page: z.number().optional(),
            limit: z.number().optional()
        }),
        responses: {
            200: z.array(ZProject)
        },
        metadata: { ...getSecurityMetadata(), ...getPaginationHeadersMetadata() }
    },
    getById: {
        summary: 'Get Project By ID',
        path: '/projects/:id',
        method: 'GET',
        responses: {
            200: ZProject
        },
        metadata
    },
    update: {
        summary: 'Update Project',
        path: '/projects/:id',
        method: 'PATCH',
        contentType: 'multipart/form-data',
        body: ZUpdateProjectBody,
        responses: {
            200: ZProject
        },
        metadata
    },
    delete: {
        summary: 'Delete Project',
        path: '/projects/:id',
        method: 'DELETE',
        body: z.undefined(),
        responses: {
            204: z.undefined()
        },
        metadata
    },
    submit: {
        summary: 'Submit Project For Approval',
        path: '/projects/:id/submit',
        method: 'POST',
        body: z.undefined(),
        responses: {
            202: z.undefined()
        },
        metadata
    }
})
