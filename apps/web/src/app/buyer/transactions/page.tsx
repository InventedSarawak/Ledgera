'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ExternalLink, ChevronLeft, ChevronRight, History, Award } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getBuyerPurchases } from '@/lib/api/marketplace'
import { PurchaseWithDetails } from '@/lib/types'
import { useState } from 'react'
import { CertificateDialog } from '@/components/marketplace/CertificateDialog'

export default function BuyerTransactionsPage() {
    const [page, setPage] = useState(1)
    const limit = 20
    const [certPurchase, setCertPurchase] = useState<PurchaseWithDetails | null>(null)

    const { data, isLoading, error } = useQuery({
        queryKey: ['buyer-transactions', page, limit],
        queryFn: () => getBuyerPurchases({ page, limit })
    })

    const purchases: PurchaseWithDetails[] = data?.data ?? []
    const totalPages = data ? Math.ceil(data.total / limit) : 0

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Transaction History</h2>
                    <p className="text-muted-foreground">View your purchase and retirement history</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Transactions</CardTitle>
                        <CardDescription>{data ? `${data.total} total transactions` : 'Loading...'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 text-destructive">
                                Failed to load transactions. Please try again.
                            </div>
                        ) : purchases.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <History className="h-12 w-12 mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground">
                                    No transactions yet. Visit the marketplace to make your first purchase.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Table header */}
                                <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_0.5fr_0.5fr] gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                                    <span>Project</span>
                                    <span>Amount</span>
                                    <span>Price/Credit</span>
                                    <span>Total</span>
                                    <span>Tx Hash</span>
                                    <span>Date</span>
                                    <span>Certificate</span>
                                </div>

                                <div className="divide-y">
                                    {purchases.map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_0.5fr_0.5fr] gap-2 md:gap-4 px-4 py-4 items-center hover:bg-muted/50 rounded-lg">
                                            {/* Project */}
                                            <div className="flex items-center gap-2">
                                                <Badge>Buy</Badge>
                                                <div>
                                                    <p className="font-medium">{tx.projectTitle}</p>
                                                    {tx.tokenSymbol && (
                                                        <span className="text-xs text-muted-foreground font-mono">
                                                            {tx.tokenSymbol}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Amount */}
                                            <div>
                                                <span className="md:hidden text-xs text-muted-foreground">
                                                    Amount:{' '}
                                                </span>
                                                <span className="font-semibold">
                                                    {(tx.scaledAmount / 1000).toLocaleString(undefined, {
                                                        maximumFractionDigits: 3
                                                    })}{' '}
                                                    Credits
                                                </span>
                                            </div>

                                            {/* Price per credit */}
                                            <div>
                                                <span className="md:hidden text-xs text-muted-foreground">Price: </span>
                                                <span>{tx.priceEth} ETH</span>
                                            </div>

                                            {/* Total */}
                                            <div>
                                                <span className="md:hidden text-xs text-muted-foreground">Total: </span>
                                                <span className="font-semibold">{tx.totalEth.toFixed(6)} ETH</span>
                                            </div>

                                            {/* Tx Hash */}
                                            <div className="flex items-center gap-1">
                                                <span className="font-mono text-xs text-muted-foreground truncate max-w-45">
                                                    {tx.txHash}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 shrink-0"
                                                    onClick={() => navigator.clipboard.writeText(tx.txHash)}
                                                    title="Copy tx hash">
                                                    <ExternalLink className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            {/* Date */}
                                            <div className="text-sm text-muted-foreground">
                                                {new Date(tx.createdAt).toLocaleDateString()}
                                            </div>

                                            {/* Certificate */}
                                            <div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-1 text-xs"
                                                    onClick={() => setCertPurchase(tx)}>
                                                    <Award className="h-3 w-3" />
                                                    View
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 pt-4">
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
                    </CardContent>
                </Card>
            </div>

            <CertificateDialog
                open={!!certPurchase}
                onOpenChange={(open) => !open && setCertPurchase(null)}
                purchase={certPurchase}
            />
        </DashboardLayout>
    )
}
