'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { Roles } from '@/types/globals'

export async function setUserRole(role: Roles) {
    const { userId } = await auth()

    if (!userId) {
        return { success: false, error: 'User not found' }
    }

    try {
        const client = await clerkClient()

        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                role: role
            }
        })

        return { success: true }
    } catch (error) {
        console.error('Error updating user role:', error)
        return { success: false, error: 'Failed to update role' }
    }
}
