'use client'
import { useUser, useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'
import axiosInstance from '@/utils/axios'

export function AuthSync() {
    const { user } = useUser()
    const { getToken } = useAuth()

    useEffect(() => {
        const sync = async () => {
            if (!user) return

            const token = await getToken()
            const email = user.primaryEmailAddress?.emailAddress

            await axiosInstance.post(
                '/auth/sync-user',
                { email },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )
        }

        sync()
    }, [user, getToken])

    return null
}
