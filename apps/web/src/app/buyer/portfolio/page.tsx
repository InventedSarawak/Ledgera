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
import {
    Leaf,
    DollarSign,
    Package,
    Loader2,
    ShoppingBag,
    Tag,
    Wallet,
    Award
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getBuyerPurchases,
    createMarketplaceListing,
    listMarketplaceListings,
    listRetirements
} from '@/lib/api/marketplace'
import { PurchaseWithDetails } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useWallet } from '@/hooks/use-wallet'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { CertificateDialog } from '@/components/marketplace/CertificateDialog'

interface Holding {
    projectId: string
    projectTitle: string
    tokenSymbol: string | null
    tokenAddress: string | null
    tokenId: number
    totalAmount: number
    listedAmount: number
    retiredAmount: number
    availableAmount: number
    totalSpentEth: number
    purchaseCount: number
    lastPurchaseDate: string
}

export default function BuyerPortfolioPage() {
    const { toast } = useToast()
    const { userId } = useAuth()
    const queryClient = useQueryClient()
    const { walletAddress, isConnected, solBalance } = useWallet()
    const [sellDialogOpen, setSellDialogOpen] = useState(false)
    const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null)
    const [sellAmount, setSellAmount] = useState('')
    const [sellPrice, setSellPrice] = useState('')
    const [certPurchase, setCertPurchase] = useState<PurchaseWithDetails | null>(null)

    const { data, isLoading, error } = useQuery({
        queryKey: ['buyer-purchases'],
        queryFn: () => getBuyerPurchases({ page: 1, limit: 50 })
    })

    // Fetch user's active listings to compute already-listed amounts
    const { data: listingsData } = useQuery({
        queryKey: ['marketplace-listings-all'],
        queryFn: () => listMarketplaceListings({ limit: 100 })
    })

    // Fetch user's retirements to compute already-retired amounts
    const { data: retirementsData } = useQuery({
        queryKey: ['buyer-retirements-all'],
        queryFn: () => listRetirements({ limit: 100 })
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
            if (msg.toLowerCase().includes('connect your wallet') && false) {
                setSellDialogOpen(false)
                toast({
                    title: 'Wallet Not Synced',
                    description: 'Please connect your Solana wallet to list credits.',
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
                const key = `${listing.projectId}-${listing.tokenId}`
                map.set(key, (map.get(key) || 0) + listing.scaledAmount / 1000)
            }
        }
        return map
    }, [listingsData, userId])

    // Aggregate by project AND tokenId for portfolio view to maintain lot provenance
    const projectMap = new Map<string, Holding>()
    for (const p of purchases) {
        const key = `${p.projectId}-${p.tokenId}`
        const unscaledAmount = p.scaledAmount / 1000
        const existing = projectMap.get(key)
        if (existing) {
            existing.totalAmount += unscaledAmount
            existing.totalSpentEth += p.totalEth
            existing.purchaseCount += 1
            if (p.createdAt > existing.lastPurchaseDate) {
                existing.lastPurchaseDate = p.createdAt
            }
        } else {
            projectMap.set(key, {
                projectId: p.projectId,
                projectTitle: p.projectTitle,
                tokenSymbol: p.tokenSymbol,
                tokenAddress: p.tokenAddress,
                tokenId: p.tokenId,
                totalAmount: unscaledAmount,
                listedAmount: 0,
                retiredAmount: 0,
                availableAmount: 0,
                totalSpentEth: p.totalEth,
                purchaseCount: 1,
                lastPurchaseDate: p.createdAt
            })
        }
    }

    // Compute retired amounts per lot for the current user
    const retiredByLot = useMemo(() => {
        const map = new Map<string, number>()
        if (!retirementsData?.data) return map
        for (const cert of retirementsData.data) {
            const key = `${cert.projectId}-${cert.tokenId}`
            map.set(key, (map.get(key) || 0) + cert.amountRetired)
        }
        return map
    }, [retirementsData])

    // Apply listed + retired amounts
    for (const [, holding] of projectMap) {
        const key = `${holding.projectId}-${holding.tokenId}`
        holding.listedAmount = listedByProject.get(key) || 0
        holding.retiredAmount = retiredByLot.get(key) || 0
        holding.availableAmount = Math.max(0, holding.totalAmount - holding.listedAmount - holding.retiredAmount)
    }

    const holdings = Array.from(projectMap.values())
    const totalCredits = holdings.reduce((acc, h) => acc + h.totalAmount, 0)
    const totalSpent = holdings.reduce((acc, h) => acc + h.totalSpentEth, 0)

    const handleOpenSellDialog = (holding: Holding) => {
        // Check wallet connection before opening sell dialog
        if (!walletAddress) {
            toast({
                title: 'Wallet Not Connected',
                description: 'Please connect your Solana wallet first.',
                variant: 'destructive'
            })
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
                description:
                    selectedHolding.availableAmount <= 0
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
            tokenId: selectedHolding.tokenId,
            amount,
            priceEth: price
        })
    }, [selectedHolding, sellAmount, sellPrice, toast, createListingMutation])



    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">My Portfolio</h2>
                        <p className="text-muted-foreground">Track your carbon credit holdings and trade tokens</p>
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
                            <p className="text-3xl font-bold">{totalSpent.toFixed(6)} SOL</p>
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
                                        key={`${holding.projectId}-${holding.tokenId}`}
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
                                                    <span className="text-muted-foreground">
                                                        {' '}
                                                        / {holding.totalAmount.toLocaleString()}
                                                    </span>
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
                                                    {holding.totalSpentEth.toFixed(6)} SOL
                                                </p>
                                                <p className="text-sm text-muted-foreground">Total Invested</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        // Find the most recent purchase for this holding
                                                        const match = purchases.find(
                                                            (p) =>
                                                                p.projectId === holding.projectId &&
                                                                p.tokenId === holding.tokenId
                                                        )
                                                        if (match) setCertPurchase(match)
                                                    }}
                                                    className="gap-1">
                                                    <Award className="h-3 w-3" />
                                                    Certificate
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenSellDialog(holding)}
                                                    disabled={holding.availableAmount <= 0}
                                                    className="gap-1">
                                                    <Tag className="h-3 w-3" />
                                                    {holding.availableAmount <= 0 ? 'All Listed' : 'Sell Credits'}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Last purchase: {new Date(holding.lastPurchaseDate).toLocaleDateString()}
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
                                            <Button
                                                variant="link"
                                                className="p-0 h-auto text-xs"
                                                onClick={() => setCertPurchase(tx)}>
                                                View Certificate
                                            </Button>
                                        </div>

                                        <div className="text-right">
                                            <p className="font-bold text-lg">
                                                {(tx.scaledAmount / 1000).toLocaleString(undefined, {
                                                    maximumFractionDigits: 3
                                                })}{' '}
                                                Credits
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                @ {tx.priceEth} SOL = {tx.totalEth.toFixed(6)} SOL
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
                                            <span>
                                                {' '}
                                                ({selectedHolding.listedAmount.toLocaleString()} already listed)
                                            </span>
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
                                            onClick={() => setSellAmount(selectedHolding.availableAmount.toString())}
                                            className="text-xs whitespace-nowrap">
                                            Max
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="sell-price">Price per Credit (SOL)</Label>
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
                                            {(parseFloat(sellAmount) * parseFloat(sellPrice)).toFixed(6)} SOL
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


            </div>

            <CertificateDialog
                open={!!certPurchase}
                onOpenChange={(open) => !open && setCertPurchase(null)}
                purchase={certPurchase}
            />
        </DashboardLayout>
    )
}
