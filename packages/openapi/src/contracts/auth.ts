import { initContract } from '@ts-rest/core'
import { ZSyncUserPayload, ZUser } from '@ledgera/zod'
import { getSecurityMetadata } from '../utils.js'

const c = initContract()
const metadata = getSecurityMetadata()

export const authContract = c.router({
    syncUser: {
        summary: 'Sync User',
        path: '/auth/sync-user',
        method: 'POST',
        body: ZSyncUserPayload,
        description: 'Sync user data from Clerk to local database',
        responses: {
            200: ZUser
        },
        metadata: metadata
    }
})
