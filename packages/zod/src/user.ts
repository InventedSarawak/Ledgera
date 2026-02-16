import { z } from 'zod'

export const ZUserRole = z.enum(['ADMIN', 'SUPPLIER', 'BUYER'])

export const ZUser = z.object({
    id: z.string().uuid(),
    clerkId: z.string(),
    email: z.string().email(),
    walletAddress: z.string().nullable().optional(),
    role: ZUserRole,
    createdAt: z.string(),
    updatedAt: z.string()
})

export const ZSyncUserPayload = z.object({
    email: z.string().email(),
    walletAddress: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/)
        .optional()
})

export type TUser = z.infer<typeof ZUser>
export type TSyncUserPayload = z.infer<typeof ZSyncUserPayload>
