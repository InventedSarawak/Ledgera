'use client'

import { setUserRole } from '@/actions/user'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConnectWallet } from '@/components/wallet/ConnectWallet'
import { User, Building2 } from 'lucide-react'
import { useState } from 'react'
import { useUser, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import axiosInstance from '@/utils/axios'

export default function OnboardingPage() {
    const { user } = useUser()
    const { getToken } = useAuth()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [selectedRole, setSelectedRole] = useState<'buyer' | 'supplier' | null>(null)
    const [walletAddress, setWalletAddress] = useState<string>('')

    const handleRoleSelect = (role: 'buyer' | 'supplier') => {
        setSelectedRole(role)
    }

    const handleWalletConnect = (address: string) => {
        setWalletAddress(address)
    }

    const handleComplete = async () => {
        if (!user || !selectedRole) return
        setIsLoading(true)

        try {
            // 1. Update role in Clerk
            const roleResult = await setUserRole(selectedRole)

            if (!roleResult.success) {
                throw new Error('Failed to set role')
            }

            // 2. Get token and sync user with wallet address to backend
            const token = await getToken()
            const email = user.primaryEmailAddress?.emailAddress

            await axiosInstance.post(
                '/auth/sync-user',
                {
                    email,
                    walletAddress: walletAddress || undefined
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            // 3. Force client to refresh token and get new metadata
            await user.reload()

            // 4. Navigate to home
            router.push('/')
        } catch (err) {
            console.error('Onboarding error:', err)
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
                        className={`cursor-pointer transition-all hover:shadow-md ${isLoading ? 'opacity-50 pointer-events-none' : selectedRole === 'buyer' ? 'border-primary border-2' : 'hover:border-primary'}`}
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
                        className={`cursor-pointer transition-all hover:shadow-md ${isLoading ? 'opacity-50 pointer-events-none' : selectedRole === 'supplier' ? 'border-primary border-2' : 'hover:border-primary'}`}
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

                {selectedRole && (
                    <div className="space-y-4 border-t pt-6">
                        <div className="text-center space-y-2">
                            <h2 className="text-lg font-semibold">Connect Your Wallet</h2>
                            <p className="text-sm text-muted-foreground">
                                {selectedRole === 'supplier'
                                    ? 'Required to receive payments for your carbon credits'
                                    : 'Optional - Connect to purchase credits directly'}
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <ConnectWallet onConnect={handleWalletConnect} currentAddress={walletAddress} />
                        </div>

                        <div className="flex justify-center pt-4">
                            <Button
                                onClick={handleComplete}
                                disabled={isLoading || (selectedRole === 'supplier' && !walletAddress)}
                                size="lg"
                                className="w-full max-w-xs">
                                {isLoading
                                    ? 'Setting up...'
                                    : selectedRole === 'supplier' && !walletAddress
                                      ? 'Connect Wallet to Continue'
                                      : 'Complete Setup'}
                            </Button>
                        </div>

                        {selectedRole === 'buyer' && !walletAddress && (
                            <p className="text-center text-xs text-muted-foreground">
                                You can connect your wallet later in settings
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
