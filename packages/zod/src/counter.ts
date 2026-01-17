import { z } from 'zod'

export const ZCounter = z.object({
    id: z.string().uuid(),
    user_id: z.string(),
    count: z.number().int(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
})

export type Counter = z.infer<typeof ZCounter>
