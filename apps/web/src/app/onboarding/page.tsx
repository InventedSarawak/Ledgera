'use client'

import { setUserRole } from '@/actions/user' // Check this import path matches your project
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Building2 } from 'lucide-react'
import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
    const { user } = useUser()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleRoleSelect = async (role: 'buyer' | 'supplier') => {
        if (!user) return
        setIsLoading(true)

        try {
            // 1. Update metadata on server
            const result = await setUserRole(role)

            if (result.success) {
                // 2. CRITICAL: Force client to refresh token and get new metadata
                await user.reload()

                // 3. Navigate to home (now authorized)
                router.push('/')
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="mx-auto max-w-2xl w-full space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome to Ledgera</h1>
                    <p className="text-muted-foreground">How do you plan to use the marketplace?</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Buyer Card */}
                    <Card
                        className={`cursor-pointer transition-all hover:shadow-md ${isLoading ? 'opacity-50 pointer-events-none' : 'hover:border-primary'}`}
                        onClick={() => handleRoleSelect('buyer')}>
                        <CardHeader>
                            <div className="mb-4 h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                <User className="h-6 w-6" />
                            </div>
                            <CardTitle>I want to Buy Credits</CardTitle>
                            <CardDescription>Purchase verifiable carbon offsets.</CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Supplier Card */}
                    <Card
                        className={`cursor-pointer transition-all hover:shadow-md ${isLoading ? 'opacity-50 pointer-events-none' : 'hover:border-primary'}`}
                        onClick={() => handleRoleSelect('supplier')}>
                        <CardHeader>
                            <div className="mb-4 h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <CardTitle>I am a Supplier</CardTitle>
                            <CardDescription>List and sell your carbon credits.</CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        </div>
    )
}
