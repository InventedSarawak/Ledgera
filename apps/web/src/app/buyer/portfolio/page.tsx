'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Leaf, DollarSign, Package, Loader2, ShoppingBag, Tag, Wallet, AlertTriangle, ExternalLink } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBuyerPurchases, createMarketplaceListing, listMarketplaceListings } from '@/lib/api/marketplace'
import { PurchaseWithDetails } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useWallet } from '@/hooks/use-wallet'
import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'

interface Holding {
    projectId: string
    projectTitle: string
    tokenSymbol: string | null
    tokenAddress: string | null
    totalAmount: number
    listedAmount: number
    availableAmount: number
    totalSpentEth: number
    purchaseCount: number
    lastPurchaseDate: string
}

export default function BuyerPortfolioPage() {
    const { toast } = useToast()
    const { userId } = useAuth()
    const queryClient = useQueryClient()
    const { walletAddress, hasMetaMask, isConnecting, connectWallet } = useWallet()
    const [sellDialogOpen, setSellDialogOpen] = useState(false)
    const [walletDialogOpen, setWalletDialogOpen] = useState(false)
    const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null)
    const [sellAmount, setSellAmount] = useState('')
    const [sellPrice, setSellPrice] = useState('')

    const { data, isLoading, error } = useQuery({
        queryKey: ['buyer-purchases'],
        queryFn: () => getBuyerPurchases({ page: 1, limit: 50 })
    })

    // Fetch user's active listings to compute already-listed amounts
    const { data: listingsData } = useQuery({
        queryKey: ['marketplace-listings-all'],
        queryFn: () => listMarketplaceListings({ limit: 100 })
    })

    const createListingMutation = useMutation({
        mutationFn: createMarketplaceListing,
        onSuccess: () => {
            toast({
                title: 'Listing Created!',
                description: 'Your credits are now available on the marketplace for other buyers.'
            })
            queryClient.invalidateQueries({ queryKey: ['buyer-purchases'] })
            queryClient.invalidateQueries({ queryKey: ['marketplace-listings-all'] })
            setSellDialogOpen(false)
            setSelectedHolding(null)
            setSellAmount('')
            setSellPrice('')
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            const msg = error.response?.data?.message || ''
            // If backend says wallet not connected, prompt user to connect
            if (msg.toLowerCase().includes('connect your wallet')) {
                setSellDialogOpen(false)
                setWalletDialogOpen(true)
                toast({
                    title: 'Wallet Not Synced',
                    description: 'Please connect your MetaMask wallet to list credits.',
                    variant: 'destructive'
                })
                return
            }
            toast({
                title: 'Failed to Create Listing',
                description: msg || 'An error occurred',
                variant: 'destructive'
            })
        }
    })

    const purchases: PurchaseWithDetails[] = data?.data ?? []

    // Compute listed amounts per project for the current user
    const listedByProject = useMemo(() => {
        const map = new Map<string, number>()
        if (!listingsData?.data || !userId) return map
        for (const listing of listingsData.data) {
            if (listing.sellerId === userId && listing.active) {
                map.set(listing.projectId, (map.get(listing.projectId) || 0) + listing.amount)
            }
        }
        return map
    }, [listingsData, userId])

    // Aggregate by project for portfolio view
    const projectMap = new Map<string, Holding>()
    for (const p of purchases) {
        const existing = projectMap.get(p.projectId)
        if (existing) {
            existing.totalAmount += p.amount
            existing.totalSpentEth += p.totalEth
            existing.purchaseCount += 1
            if (p.createdAt > existing.lastPurchaseDate) {
                existing.lastPurchaseDate = p.createdAt
            }
        } else {
            projectMap.set(p.projectId, {
                projectId: p.projectId,
                projectTitle: p.projectTitle,
                tokenSymbol: p.tokenSymbol,
                tokenAddress: p.tokenAddress,
                totalAmount: p.amount,
                listedAmount: 0,
                availableAmount: 0,
                totalSpentEth: p.totalEth,
                purchaseCount: 1,
                lastPurchaseDate: p.createdAt
            })
        }
    }

    // Apply listed amounts
    for (const [, holding] of projectMap) {
        holding.listedAmount = listedByProject.get(holding.projectId) || 0
        holding.availableAmount = Math.max(0, holding.totalAmount - holding.listedAmount)
    }

    const holdings = Array.from(projectMap.values())
    const totalCredits = holdings.reduce((acc, h) => acc + h.totalAmount, 0)
    const totalSpent = holdings.reduce((acc, h) => acc + h.totalSpentEth, 0)

    const handleOpenSellDialog = (holding: Holding) => {
        // Check wallet connection before opening sell dialog
        if (!walletAddress) {
            setWalletDialogOpen(true)
            return
        }
        setSelectedHolding(holding)
        setSellAmount('')
        setSellPrice('')
        setSellDialogOpen(true)
    }

    const handleSellCredits = useCallback(() => {
        if (!selectedHolding || !sellAmount || !sellPrice) {
            toast({ title: 'Missing fields', description: 'Please fill in amount and price', variant: 'destructive' })
            return
        }

        const amount = parseFloat(sellAmount)
        const price = parseFloat(sellPrice)
        if (amount <= 0 || amount > selectedHolding.availableAmount) {
            toast({
                title: 'Invalid Amount',
                description: selectedHolding.availableAmount <= 0
                    ? 'All your credits are currently listed on the marketplace'
                    : `Enter an amount between 1 and ${selectedHolding.availableAmount}`,
                variant: 'destructive'
            })
            return
        }
        if (price <= 0) {
            toast({ title: 'Invalid Price', description: 'Price must be greater than 0', variant: 'destructive' })
            return
        }
        createListingMutation.mutate({
            projectId: selectedHolding.projectId,
            amount,
            priceEth: price
        })
    }, [selectedHolding, sellAmount, sellPrice, walletAddress, toast, createListingMutation])

    const handleConnectFromDialog = useCallback(async () => {
        const address = await connectWallet()
        if (address) {
            setWalletDialogOpen(false)
        }
    }, [connectWallet])

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">My Portfolio</h2>
                        <p className="text-muted-foreground">Track your carbon credit holdings and trade tokens</p>
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

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Leaf className="h-4 w-4 text-green-600" />
                                Total Credits
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{totalCredits.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-1">Carbon Credits Owned</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-blue-600" />
                                Total Spent
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{totalSpent.toFixed(6)} ETH</p>
                            <p className="text-xs text-muted-foreground mt-1">Total Investment</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-orange-600" />
                                Projects
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{holdings.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">Unique Projects</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Holdings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Your Carbon Credit Holdings</CardTitle>
                        <CardDescription>Manage your holdings — sell credits on the marketplace</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 text-destructive">
                                Failed to load portfolio. Please try again.
                            </div>
                        ) : holdings.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground">
                                    No credits purchased yet. Visit the marketplace to buy carbon credits.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {holdings.map((holding) => (
                                    <div
                                        key={holding.projectId}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold">{holding.projectTitle}</h4>
                                                {holding.tokenSymbol && (
                                                    <Badge variant="outline">{holding.tokenSymbol}</Badge>
                                                )}
                                            </div>
                                            {holding.tokenAddress && (
                                                <p className="text-sm text-muted-foreground font-mono truncate max-w-md">
                                                    {holding.tokenAddress}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Available: </span>
                                                    <span className="font-semibold">
                                                        {holding.availableAmount.toLocaleString()}
                                                    </span>
                                                    <span className="text-muted-foreground"> / {holding.totalAmount.toLocaleString()}</span>
                                                </div>
                                                {holding.listedAmount > 0 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {holding.listedAmount.toLocaleString()} Listed
                                                    </Badge>
                                                )}
                                                <div>
                                                    <span className="text-muted-foreground">Purchases: </span>
                                                    <span className="font-semibold">{holding.purchaseCount}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <div className="text-right">
                                                <p className="text-2xl font-bold">
                                                    {holding.totalSpentEth.toFixed(6)} ETH
                                                </p>
                                                <p className="text-sm text-muted-foreground">Total Invested</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenSellDialog(holding)}
                                                disabled={holding.availableAmount <= 0}
                                                className="gap-1">
                                                <Tag className="h-3 w-3" />
                                                {holding.availableAmount <= 0 ? 'All Listed' : 'Sell Credits'}
                                            </Button>
                                            <p className="text-xs text-muted-foreground">
                                                Last purchase:{' '}
                                                {new Date(holding.lastPurchaseDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Transactions */}
                {purchases.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Transactions</CardTitle>
                            <CardDescription>Your latest carbon credit purchases</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {purchases.slice(0, 10).map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge>Purchase</Badge>
                                                <span className="font-semibold">{tx.projectTitle}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(tx.createdAt).toLocaleString()}
                                            </p>
                                            <p className="text-xs font-mono text-muted-foreground truncate max-w-md">
                                                {tx.txHash}
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <p className="font-bold text-lg">
                                                {tx.amount.toLocaleString()} Credits
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                @ {tx.priceEth} ETH = {tx.totalEth.toFixed(6)} ETH
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Sell Credits Dialog */}
                <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Sell Carbon Credits</DialogTitle>
                            <DialogDescription>
                                {selectedHolding
                                    ? `List credits from "${selectedHolding.projectTitle}" on the marketplace`
                                    : 'Create a marketplace listing'}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedHolding && (
                            <div className="space-y-4">
                                <div className="p-3 bg-muted rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold">{selectedHolding.projectTitle}</span>
                                        {selectedHolding.tokenSymbol && (
                                            <Badge variant="outline">{selectedHolding.tokenSymbol}</Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Available: {selectedHolding.availableAmount.toLocaleString()} credits
                                        {selectedHolding.listedAmount > 0 && (
                                            <span> ({selectedHolding.listedAmount.toLocaleString()} already listed)</span>
                                        )}
                                    </p>
                                    {!walletAddress && (
                                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Connect your wallet before listing
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="sell-amount">Amount to Sell</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Input
                                            id="sell-amount"
                                            type="number"
                                            min={1}
                                            max={selectedHolding.availableAmount}
                                            step="any"
                                            placeholder="100"
                                            value={sellAmount}
                                            onChange={(e) => setSellAmount(e.target.value)}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setSellAmount(selectedHolding.availableAmount.toString())
                                            }
                                            className="text-xs whitespace-nowrap">
                                            Max
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="sell-price">Price per Credit (ETH)</Label>
                                    <Input
                                        id="sell-price"
                                        type="number"
                                        step="0.0001"
                                        min="0.0001"
                                        placeholder="0.01"
                                        value={sellPrice}
                                        onChange={(e) => setSellPrice(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>

                                {sellAmount && sellPrice && (
                                    <div className="p-4 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">Total Listing Value</p>
                                        <p className="text-2xl font-bold">
                                            {(parseFloat(sellAmount) * parseFloat(sellPrice)).toFixed(6)} ETH
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSellDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSellCredits} disabled={createListingMutation.isPending}>
                                {createListingMutation.isPending ? 'Creating Listing...' : 'List for Sale'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Wallet Connection Dialog */}
                <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Wallet Not Connected
                            </DialogTitle>
                            <DialogDescription>
                                You need to connect your MetaMask wallet before you can list credits for sale.
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
                                        Click the button below to connect your MetaMask wallet.
                                        Your wallet address will be saved so buyers can send you ETH.
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setWalletDialogOpen(false)}>Cancel</Button>
                            {hasMetaMask && (
                                <Button onClick={handleConnectFromDialog} disabled={isConnecting} className="gap-2">
                                    <Wallet className="h-4 w-4" />
                                    {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
