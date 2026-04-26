'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ListingCard } from '@/components/marketplace/ListingCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useWallet } from '@/hooks/use-wallet'
import { listMarketplaceListings } from '@/lib/api/marketplace'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, ChevronLeft, ChevronRight, Wallet, AlertTriangle } from 'lucide-react'
import { useState, useCallback } from 'react'
import { ListingWithDetails } from '@/lib/types'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function BuyerMarketplacePage() {
    const { toast } = useToast()
    const { walletAddress, isConnected, solBalance } = useWallet()
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(12)
    const [searchQuery, setSearchQuery] = useState('')

    const { data, isLoading, error } = useQuery({
        queryKey: ['marketplace-listings', page, limit],
        queryFn: () => listMarketplaceListings({ page, limit })
    })

    // TODO: Implement Solana-based purchase flow
    // The previous ETH-based handleBuy has been stubbed out.
    const handleBuy = useCallback(
        async (listingId: string, buyAmount: number) => {
            const listing = data?.data.find((l: ListingWithDetails) => l.id === listingId)
            if (!listing) return

            if (!isConnected || !walletAddress) {
                toast({
                    title: 'Wallet Not Connected',
                    description: 'Please connect your Solana wallet to purchase carbon credits.',
                    variant: 'destructive'
                })
                return
            }

            // Stubbed — Solana transfer logic will be implemented later
            toast({
                title: 'Coming Soon',
                description: 'Solana-based purchases are not yet implemented. Stay tuned!',
                variant: 'destructive'
            })
        },
        [data, walletAddress, isConnected, toast]
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

                    {isConnected && walletAddress ? (
                        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                            <Wallet className="h-4 w-4 text-green-600" />
                            <span>
                                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                            </span>
                            {solBalance !== null && (
                                <span className="text-muted-foreground ml-1">
                                    ({solBalance.toFixed(4)} SOL)
                                </span>
                            )}
                        </div>
                    ) : (
                        <WalletMultiButton />
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
                                    isLoading={false}
                                />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {page} of {totalPages}
                                </span>
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
