'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Leaf, DollarSign, Package, Loader2, ShoppingBag } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getBuyerPurchases } from '@/lib/api/marketplace'
import { PurchaseWithDetails } from '@/lib/types'

export default function BuyerPortfolioPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['buyer-purchases'],
        queryFn: () => getBuyerPurchases({ page: 1, limit: 50 })
    })

    const purchases: PurchaseWithDetails[] = data?.data ?? []

    // Aggregate by project for portfolio view
    const projectMap = new Map<
        string,
        {
            projectId: string
            projectTitle: string
            tokenSymbol: string | null
            tokenAddress: string | null
            totalAmount: number
            totalSpentEth: number
            purchaseCount: number
            lastPurchaseDate: string
        }
    >()

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
                totalSpentEth: p.totalEth,
                purchaseCount: 1,
                lastPurchaseDate: p.createdAt
            })
        }
    }

    const holdings = Array.from(projectMap.values())
    const totalCredits = holdings.reduce((acc, h) => acc + h.totalAmount, 0)
    const totalSpent = holdings.reduce((acc, h) => acc + h.totalSpentEth, 0)

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Portfolio</h2>
                    <p className="text-muted-foreground">Track your carbon credit holdings and transactions</p>
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
                        <CardDescription>Details of all projects in your portfolio</CardDescription>
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
                                                    <span className="text-muted-foreground">Credits: </span>
                                                    <span className="font-semibold">
                                                        {holding.totalAmount.toLocaleString()}
                                                    </span>
                                                </div>
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
                                        </div>

                                        <div className="text-right">
                                            <p className="font-bold text-lg">{tx.amount.toLocaleString()} Credits</p>
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
            </div>
        </DashboardLayout>
    )
}
