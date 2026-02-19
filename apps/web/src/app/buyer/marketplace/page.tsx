'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ListingCard } from '@/components/marketplace/ListingCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useWallet } from '@/hooks/use-wallet'
import { listMarketplaceListings, buyMarketplaceListing } from '@/lib/api/marketplace'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Filter, ChevronLeft, ChevronRight, Wallet, AlertTriangle, ExternalLink } from 'lucide-react'
import { useState, useCallback } from 'react'
import { ListingWithDetails } from '@/lib/types'
import { BrowserProvider, parseEther, formatEther } from 'ethers'

export default function BuyerMarketplacePage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { walletAddress, hasMetaMask, isConnecting, connectWallet } = useWallet()
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(12)
    const [searchQuery, setSearchQuery] = useState('')
    const [buyingId, setBuyingId] = useState<string | null>(null)
    const [walletDialogOpen, setWalletDialogOpen] = useState(false)
    const [pendingBuy, setPendingBuy] = useState<{ listingId: string; amount: number } | null>(null)

    const { data, isLoading, error } = useQuery({
        queryKey: ['marketplace-listings', page, limit],
        queryFn: () => listMarketplaceListings({ page, limit })
    })

    const confirmPurchaseMutation = useMutation({
        mutationFn: ({ listingId, txHash, amount, wallet }: { listingId: string; txHash: string; amount: number; wallet: string }) =>
            buyMarketplaceListing(listingId, txHash, wallet, amount),
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

    const handleBuy = useCallback(
        async (listingId: string, buyAmount: number) => {
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

            // Check wallet connection
            if (!walletAddress) {
                setPendingBuy({ listingId, amount: buyAmount })
                setWalletDialogOpen(true)
                return
            }

            setBuyingId(listingId)

            try {
                const totalPriceEth = buyAmount * listing.priceEth
                const totalPriceWei = parseEther(totalPriceEth.toFixed(18))

                toast({
                    title: 'Confirm in MetaMask',
                    description: `Sending ${formatEther(totalPriceWei)} ETH to seller...`
                })

                const provider = new BrowserProvider(window.ethereum!)
                const signer = await provider.getSigner()

                const tx = await signer.sendTransaction({
                    to: listing.sellerWalletAddress,
                    value: totalPriceWei
                })

                toast({ title: 'Transaction Sent', description: 'Waiting for confirmation...' })

                const receipt = await tx.wait()
                if (!receipt || receipt.status !== 1) {
                    throw new Error('Transaction failed on-chain')
                }

                toast({ title: 'Payment Confirmed', description: 'Verifying purchase on the server...' })

                confirmPurchaseMutation.mutate({
                    listingId,
                    txHash: receipt.hash,
                    amount: buyAmount,
                    wallet: walletAddress
                })
            } catch (error) {
                console.error('Buy failed:', error)
                const err = error as { code?: string | number }
                if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
                    toast({ title: 'Transaction Cancelled', description: 'You rejected the transaction in MetaMask', variant: 'destructive' })
                } else if ((err.code as number) === -32002) {
                    toast({ title: 'Check MetaMask', description: 'A transaction request is already pending in MetaMask', variant: 'destructive' })
                } else {
                    toast({ title: 'Purchase Failed', description: error instanceof Error ? error.message : 'An unexpected error occurred', variant: 'destructive' })
                }
                setBuyingId(null)
            }
        },
        [data, walletAddress, confirmPurchaseMutation, toast]
    )

    const handleConnectFromDialog = useCallback(async () => {
        const address = await connectWallet()
        if (address) {
            setWalletDialogOpen(false)
            if (pendingBuy) {
                const { listingId, amount } = pendingBuy
                setPendingBuy(null)
                setTimeout(() => handleBuy(listingId, amount), 200)
            }
        }
    }, [connectWallet, pendingBuy, handleBuy])

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

                    {walletAddress ? (
                        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                            <Wallet className="h-4 w-4 text-green-600" />
                            <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (hasMetaMask) connectWallet()
                                else setWalletDialogOpen(true)
                            }}
                            disabled={isConnecting}
                            className="gap-2">
                            <Wallet className="h-4 w-4" />
                            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
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

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                                <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Wallet Connection Dialog */}
            <Dialog open={walletDialogOpen} onOpenChange={(open) => { setWalletDialogOpen(open); if (!open) setPendingBuy(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Wallet Not Connected
                        </DialogTitle>
                        <DialogDescription>
                            You need to connect your MetaMask wallet before you can purchase carbon credits.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {!hasMetaMask ? (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-3">
                                <p className="font-semibold text-sm">MetaMask Not Detected</p>
                                <p className="text-sm text-muted-foreground">
                                    Please install the MetaMask browser extension to interact with the blockchain.
                                </p>
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open('https://metamask.io/download/', '_blank')}>
                                    <ExternalLink className="h-3 w-3" />
                                    Install MetaMask
                                </Button>
                            </div>
                        ) : (
                            <div className="p-4 bg-muted rounded-lg space-y-2">
                                <p className="font-semibold text-sm">Connect Your Wallet</p>
                                <p className="text-sm text-muted-foreground">
                                    Click the button below to connect your MetaMask wallet. You&apos;ll be prompted to approve the connection.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setWalletDialogOpen(false); setPendingBuy(null) }}>Cancel</Button>
                        {hasMetaMask && (
                            <Button onClick={handleConnectFromDialog} disabled={isConnecting} className="gap-2">
                                <Wallet className="h-4 w-4" />
                                {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    )
}
