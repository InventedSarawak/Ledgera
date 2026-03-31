'use client'

import { useAuth } from '@clerk/nextjs'
import axiosInstance from '@/utils/axios'
import { useEffect } from 'react'

/**
 * Attaches the Clerk token to all outgoing Axios requests.
 */
export function AxiosAuthInterceptor() {
    const { getToken, userId } = useAuth()

    useEffect(() => {
        // Register the request interceptor
        const requestInterceptor = axiosInstance.interceptors.request.use(
            async (config) => {
                // If there is no user, just proceed (public routes might still work)
                if (!userId) {
                    return config
                }

                try {
                    // Fetch the token (Clerk handles refreshing automatically)
                    const token = await getToken()
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`
                    }
                } catch (error) {
                    console.error('Failed to get auth token for request', error)
                }

                return config
            },
            (error) => {
                return Promise.reject(error)
            }
        )

        // Cleanup: Eject the interceptor when the component unmounts or deps change
        return () => {
            axiosInstance.interceptors.request.eject(requestInterceptor)
        }
    }, [getToken, userId])

    return null
}
