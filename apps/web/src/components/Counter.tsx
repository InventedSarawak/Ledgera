'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Counter = {
    id: string
    count: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function CounterComponent() {
    const queryClient = useQueryClient()
    const [error, setError] = useState<string | null>(null)
    const { getToken } = useAuth()

    const { data: counter, isLoading } = useQuery<Counter>({
        queryKey: ['counter'],
        queryFn: async () => {
            const token = await getToken()
            console.log('Token obtained:', token ? 'Yes' : 'No')
            const response = await fetch(`${API_BASE_URL}/api/v1/counter`, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            })
            if (!response.ok) {
                const error = await response.text()
                console.error('Fetch failed:', response.status, error)
                throw new Error('Failed to fetch counter')
            }
            return response.json()
        }
    })

    const incrementMutation = useMutation({
        mutationFn: async () => {
            const token = await getToken()
            console.log('Increment token:', token ? 'Yes' : 'No')
            const response = await fetch(`${API_BASE_URL}/api/v1/counter/increment`, {
                method: 'POST',
                headers: {
                    Authorization: token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            })
            if (!response.ok) {
                const error = await response.text()
                console.error('Increment failed:', response.status, error)
                throw new Error('Failed to increment')
            }
            return response.json()
        },
        onSuccess: (newCounter) => {
            queryClient.setQueryData(['counter'], newCounter)
            setError(null)
        },
        onError: (err) => {
            setError('Failed to increment counter')
            console.error(err)
        }
    })

    const decrementMutation = useMutation({
        mutationFn: async () => {
            const token = await getToken()
            const response = await fetch(`${API_BASE_URL}/api/v1/counter/decrement`, {
                method: 'POST',
                headers: {
                    Authorization: token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            })
            if (!response.ok) throw new Error('Failed to decrement')
            return response.json()
        },
        onSuccess: (newCounter) => {
            queryClient.setQueryData(['counter'], newCounter)
            setError(null)
        },
        onError: (err) => {
            setError('Failed to decrement counter')
            console.error(err)
        }
    })

    const resetMutation = useMutation({
        mutationFn: async () => {
            const token = await getToken()
            const response = await fetch(`${API_BASE_URL}/api/v1/counter/reset`, {
                method: 'POST',
                headers: {
                    Authorization: token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            })
            if (!response.ok) throw new Error('Failed to reset')
            return response.json()
        },
        onSuccess: (newCounter) => {
            queryClient.setQueryData(['counter'], newCounter)
            setError(null)
        },
        onError: (err) => {
            setError('Failed to reset counter')
            console.error(err)
        }
    })

    if (isLoading) {
        return <div>Loading...</div>
    }

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Counter</CardTitle>
                <CardDescription>Simple counter application</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold text-center my-4">{counter?.count ?? 0}</div>
                {error && <div className="text-red-500 text-sm text-center mb-2">{error}</div>}
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
                <Button
                    variant="outline"
                    onClick={() => decrementMutation.mutate()}
                    disabled={decrementMutation.isPending}>
                    −
                </Button>
                <Button variant="secondary" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
                    Reset
                </Button>
                <Button onClick={() => incrementMutation.mutate()} disabled={incrementMutation.isPending}>
                    +
                </Button>
            </CardFooter>
        </Card>
    )
}
