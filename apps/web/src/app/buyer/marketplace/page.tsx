'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ListingCard } from '@/components/marketplace/ListingCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { listMarketplaceListings, buyMarketplaceListing } from '@/lib/api/marketplace'
import { CHAIN_ID_HEX, RPC_URL } from '@/lib/constants'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Filter, ChevronLeft, ChevronRight, Wallet } from 'lucide-react'
import { useState, useCallback } from 'react'
import { ListingWithDetails } from '@/lib/types'
import { BrowserProvider, parseEther, formatEther } from 'ethers'

export default function BuyerMarketplacePage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(12)
    const [searchQuery, setSearchQuery] = useState('')
    const [buyingId, setBuyingId] = useState<string | null>(null)
    const [walletAddress, setWalletAddress] = useState<string | null>(null)

    const { data, isLoading, error } = useQuery({
        queryKey: ['marketplace-listings', page, limit],
        queryFn: () => listMarketplaceListings({ page, limit })
    })

    const confirmPurchaseMutation = useMutation({
        mutationFn: ({ listingId, txHash, amount }: { listingId: string; txHash: string; amount: number }) =>
            buyMarketplaceListing(listingId, txHash, walletAddress!, amount),
        onSuccess: () => {
            toast({
                title: 'Purchase Successful!',
                description: 'Carbon credits have been added to your portfolio.'
            })
            queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] })
            setBuyingId(null)
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast({
                title: 'Purchase Failed',
                description: error.response?.data?.message || 'Backend could not verify the transaction',
                variant: 'destructive'
            })
            setBuyingId(null)
        }
    })

    const connectWallet = useCallback(async () => {
        if (!window.ethereum) {
            toast({
                title: 'MetaMask Not Found',
                description: 'Please install MetaMask to purchase carbon credits',
                variant: 'destructive'
            })
            return null
        }

        try {
            // Switch to correct network
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: CHAIN_ID_HEX,
                            chainName: 'Anvil Local',
                            nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                            rpcUrls: [RPC_URL],
                            blockExplorerUrls: null
                        }
                    ]
                })
            } catch {
                // Network may already exist
            }

            const accounts = (await window.ethereum.request({
                method: 'eth_requestAccounts'
            })) as string[]

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found')
            }

            setWalletAddress(accounts[0])
            return accounts[0]
        } catch (error) {
            toast({
                title: 'Wallet Connection Failed',
                description: error instanceof Error ? error.message : 'Failed to connect MetaMask',
                variant: 'destructive'
            })
            return null
        }
    }, [toast])

    const handleBuy = useCallback(
        async (listingId: string, buyAmount: number) => {
            // Find the listing
            const listing = data?.data.find((l: ListingWithDetails) => l.id === listingId)
            if (!listing) return

            if (!listing.sellerWalletAddress) {
                toast({
                    title: 'Cannot Purchase',
                    description: 'Seller has not connected their wallet yet',
                    variant: 'destructive'
                })
                return
            }

            if (buyAmount <= 0 || buyAmount > listing.amount) {
                toast({
                    title: 'Invalid Amount',
                    description: `Please enter an amount between 1 and ${listing.amount}`,
                    variant: 'destructive'
                })
                return
            }

            setBuyingId(listingId)

            try {
                // 1. Ensure wallet is connected
                let address = walletAddress
                if (!address) {
                    address = await connectWallet()
                    if (!address) {
                        setBuyingId(null)
                        return
                    }
                }

                // 2. Calculate total price in ETH based on chosen amount
                const totalPriceEth = buyAmount * listing.priceEth
                const totalPriceWei = parseEther(totalPriceEth.toFixed(18))

                toast({
                    title: 'Confirm in MetaMask',
                    description: `Sending ${formatEther(totalPriceWei)} ETH to seller...`
                })

                // 3. Send ETH to seller via MetaMask
                const provider = new BrowserProvider(window.ethereum!)
                const signer = await provider.getSigner()

                const tx = await signer.sendTransaction({
                    to: listing.sellerWalletAddress,
                    value: totalPriceWei
                })

                toast({
                    title: 'Transaction Sent',
                    description: 'Waiting for confirmation...'
                })

                // 4. Wait for transaction confirmation
                const receipt = await tx.wait()
                if (!receipt || receipt.status !== 1) {
                    throw new Error('Transaction failed on-chain')
                }

                toast({
                    title: 'Payment Confirmed',
                    description: 'Verifying purchase on the server...'
                })

                // 5. Send txHash to backend for verification and token transfer
                confirmPurchaseMutation.mutate({ listingId, txHash: receipt.hash, amount: buyAmount })
            } catch (error) {
                console.error('Buy failed:', error)

                // Handle user rejection specifically
                const err = error as { code?: string | number }
                if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
                    toast({
                        title: 'Transaction Cancelled',
                        description: 'You rejected the transaction in MetaMask',
                        variant: 'destructive'
                    })
                } else {
                    toast({
                        title: 'Purchase Failed',
                        description: error instanceof Error ? error.message : 'An unexpected error occurred',
                        variant: 'destructive'
                    })
                }
                setBuyingId(null)
            }
        },
        [data, walletAddress, connectWallet, confirmPurchaseMutation, toast]
    )

    const filteredListings =
        data?.data.filter((listing) => listing.projectTitle.toLowerCase().includes(searchQuery.toLowerCase())) || []

    const totalPages = data ? Math.ceil(data.total / limit) : 0

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Browse Carbon Credits</h2>
                        <p className="text-muted-foreground">
                            Explore and purchase verified carbon credits from various projects
                        </p>
                    </div>

                    {/* Wallet Connection */}
                    {walletAddress ? (
                        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                            <Wallet className="h-4 w-4 text-green-600" />
                            <span>
                                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                            </span>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={connectWallet} className="gap-2">
                            <Wallet className="h-4 w-4" />
                            Connect Wallet
                        </Button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Select value={limit.toString()} onValueChange={(val: string) => setLimit(parseInt(val))}>
                        <SelectTrigger className="w-45">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="6">6 per page</SelectItem>
                            <SelectItem value="12">12 per page</SelectItem>
                            <SelectItem value="24">24 per page</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Listings Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-87.5" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="rounded-lg border border-destructive bg-destructive/10 p-8 text-center">
                        <p className="text-destructive">Failed to load marketplace listings</p>
                    </div>
                ) : filteredListings.length === 0 ? (
                    <div className="rounded-lg border bg-card p-12 text-center">
                        <p className="text-muted-foreground text-lg">No active listings found</p>
                        <p className="text-sm text-muted-foreground mt-2">Check back later for new opportunities</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredListings.map((listing) => (
                                <ListingCard
                                    key={listing.id}
                                    listing={listing}
                                    onBuy={handleBuy}
                                    isLoading={buyingId === listing.id}
                                />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">
                                        Page {page} of {totalPages}
                                    </span>
                                </div>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    )
}
