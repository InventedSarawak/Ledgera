'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Leaf, Loader2, Flame, Award, Download, ChevronLeft, ChevronRight, AlertTriangle, FileText } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBuyerPurchases, retireCredits, listRetirements, listMarketplaceListings } from '@/lib/api/marketplace'
import { PurchaseWithDetails, CertificateWithDetails } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useState, useMemo } from 'react'
import { downloadRetirementCertificatePDF } from '@/components/marketplace/RetirementCertificatePDF'
import { useAuth } from '@clerk/nextjs'

interface Holding {
    projectId: string
    projectTitle: string
    tokenSymbol: string | null
    tokenAddress: string | null
    tokenId: number
    totalAmount: number
    retiredAmount: number
    availableAmount: number
}

export default function BuyerRetirePage() {
    const { toast } = useToast()
    const { userId } = useAuth()
    const queryClient = useQueryClient()
    const [retireDialogOpen, setRetireDialogOpen] = useState(false)
    const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null)
    const [retireAmount, setRetireAmount] = useState('')
    const [retireReason, setRetireReason] = useState('')
    const [successCert, setSuccessCert] = useState<CertificateWithDetails | null>(null)
    const [historyPage, setHistoryPage] = useState(1)

    // Fetch buyer's holdings
    const { data: purchaseData, isLoading: purchaseLoading } = useQuery({
        queryKey: ['buyer-purchases'],
        queryFn: () => getBuyerPurchases({ page: 1, limit: 100 })
    })

    // Fetch retirement history
    const { data: retirementData, isLoading: retirementLoading } = useQuery({
        queryKey: ['buyer-retirements', historyPage],
        queryFn: () => listRetirements({ page: historyPage, limit: 10 })
    })

    // Fetch active listings to exclude listed credits
    const { data: listingsData } = useQuery({
        queryKey: ['marketplace-listings-all'],
        queryFn: () => listMarketplaceListings({ limit: 100 })
    })

    // Aggregate purchases into holdings by lot, subtracting retired + listed amounts
    const holdings = useMemo(() => {
        const purchases: PurchaseWithDetails[] = purchaseData?.data ?? []
        const retirements = retirementData?.data ?? []

        // Compute retired amounts per lot
        const retiredByLot = new Map<string, number>()
        for (const cert of retirements) {
            const key = `${cert.projectId}-${cert.tokenId}`
            retiredByLot.set(key, (retiredByLot.get(key) || 0) + cert.amountRetired)
        }

        // Compute listed amounts per lot for the current user
        const listedByLot = new Map<string, number>()
        if (listingsData?.data && userId) {
            for (const listing of listingsData.data) {
                if (listing.sellerId === userId && listing.active) {
                    const key = `${listing.projectId}-${listing.tokenId}`
                    listedByLot.set(key, (listedByLot.get(key) || 0) + listing.scaledAmount / 1000)
                }
            }
        }

        const map = new Map<string, Holding>()
        for (const p of purchases) {
            const key = `${p.projectId}-${p.tokenId}`
            const unscaled = p.scaledAmount / 1000
            const existing = map.get(key)
            if (existing) {
                existing.totalAmount += unscaled
            } else {
                map.set(key, {
                    projectId: p.projectId,
                    projectTitle: p.projectTitle,
                    tokenSymbol: p.tokenSymbol,
                    tokenAddress: p.tokenAddress,
                    tokenId: p.tokenId,
                    totalAmount: unscaled,
                    retiredAmount: 0,
                    availableAmount: 0
                })
            }
        }

        // Apply retired + listed amounts
        for (const [, holding] of map) {
            const key = `${holding.projectId}-${holding.tokenId}`
            holding.retiredAmount = retiredByLot.get(key) || 0
            const listedAmount = listedByLot.get(key) || 0
            holding.availableAmount = Math.max(0, holding.totalAmount - holding.retiredAmount - listedAmount)
        }

        return Array.from(map.values()).filter((h) => h.availableAmount > 0)
    }, [purchaseData, retirementData, listingsData, userId])

    const retireMutation = useMutation({
        mutationFn: retireCredits,
        onSuccess: (cert) => {
            toast({
                title: 'Credits Retired! 🌿',
                description: `Successfully retired ${retireAmount} credits. Certificate generated.`
            })
            queryClient.invalidateQueries({ queryKey: ['buyer-purchases'] })
            queryClient.invalidateQueries({ queryKey: ['buyer-retirements'] })
            setRetireDialogOpen(false)

            // Show success with certificate details
            const certWithDetails: CertificateWithDetails = {
                ...cert,
                projectTitle: selectedHolding?.projectTitle ?? '',
                tokenSymbol: selectedHolding?.tokenSymbol ?? null,
                tokenAddress: selectedHolding?.tokenAddress ?? null
            }
            setSuccessCert(certWithDetails)
            setSelectedHolding(null)
            setRetireAmount('')
            setRetireReason('')
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast({
                title: 'Failed to Retire Credits',
                description: error.response?.data?.message || 'An error occurred',
                variant: 'destructive'
            })
        }
    })

    const handleRetire = () => {
        if (!selectedHolding || !retireAmount) {
            toast({ title: 'Missing fields', description: 'Select a holding and enter an amount', variant: 'destructive' })
            return
        }
        const amount = parseFloat(retireAmount)
        if (amount <= 0 || amount > selectedHolding.availableAmount) {
            toast({
                title: 'You cannot retire more than you own',
                description: `You have ${selectedHolding.availableAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })} credits available to retire.`,
                variant: 'destructive'
            })
            return
        }
        retireMutation.mutate({
            projectId: selectedHolding.projectId,
            tokenId: selectedHolding.tokenId,
            amount,
            reason: retireReason || undefined
        })
    }

    const retirements = retirementData?.data ?? []
    const totalRetirementPages = retirementData ? Math.ceil(retirementData.total / 10) : 0
    const totalRetired = retirements.reduce((acc, c) => acc + c.amountRetired, 0)

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Retire Credits</h2>
                    <p className="text-muted-foreground">
                        Permanently offset your carbon footprint by retiring credits on-chain
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Leaf className="h-4 w-4 text-green-600" />
                                Available to Retire
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                {holdings.reduce((acc, h) => acc + h.totalAmount, 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Credits across {holdings.length} lots</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Flame className="h-4 w-4 text-orange-600" />
                                Total Retired
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{totalRetired.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-1">Tonnes CO₂ offset</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-purple-600" />
                                Certificates
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{retirementData?.total ?? 0}</p>
                            <p className="text-xs text-muted-foreground mt-1">Retirement certificates</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Holdings to retire */}
                <Card>
                    <CardHeader>
                        <CardTitle>Your Carbon Credit Holdings</CardTitle>
                        <CardDescription>Select a holding to retire credits</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {purchaseLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : holdings.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <Leaf className="h-12 w-12 mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground">
                                    No credits available. Purchase credits from the marketplace first.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {holdings.map((holding) => (
                                    <div
                                        key={`${holding.projectId}-${holding.tokenId}`}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold">{holding.projectTitle}</h4>
                                                {holding.tokenSymbol && (
                                                    <Badge variant="outline">{holding.tokenSymbol}</Badge>
                                                )}
                                                <Badge variant="secondary" className="text-xs">
                                                    Lot #{holding.tokenId}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {holding.availableAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })} credits available
                                                {holding.retiredAmount > 0 && (
                                                    <span className="text-orange-500 ml-1">
                                                        ({holding.retiredAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })} already retired)
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="gap-1.5"
                                            onClick={() => {
                                                setSelectedHolding(holding)
                                                setRetireAmount('')
                                                setRetireReason('')
                                                setRetireDialogOpen(true)
                                            }}>
                                            <Flame className="h-3.5 w-3.5" />
                                            Retire
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Retirement History */}
                <Card>
                    <CardHeader>
                        <CardTitle>Retirement History</CardTitle>
                        <CardDescription>
                            {retirementData ? `${retirementData.total} total retirements` : 'Loading...'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {retirementLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : retirements.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground">No retirements yet. Retire credits above to start.</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3">
                                    {retirements.map((cert) => (
                                        <div
                                            key={cert.id}
                                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3">
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-orange-50 text-orange-700 border-orange-200">
                                                        Retired
                                                    </Badge>
                                                    <span className="font-semibold">{cert.projectTitle}</span>
                                                    {cert.tokenSymbol && (
                                                        <Badge variant="secondary">{cert.tokenSymbol}</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {cert.amountRetired.toLocaleString(undefined, {
                                                        maximumFractionDigits: 3
                                                    })}{' '}
                                                    tonnes CO₂ •{' '}
                                                    {new Date(cert.createdAt).toLocaleDateString()}
                                                </p>
                                                {cert.retirementReason && (
                                                    <p className="text-xs text-muted-foreground italic">
                                                        &quot;{cert.retirementReason}&quot;
                                                    </p>
                                                )}
                                                <p className="text-xs font-mono text-muted-foreground truncate max-w-md">
                                                    TX: {cert.txHash}
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5"
                                                onClick={() => downloadRetirementCertificatePDF(cert)}>
                                                <Download className="h-3.5 w-3.5" />
                                                Certificate
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                {totalRetirementPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 pt-4">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                                            disabled={historyPage === 1}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm text-muted-foreground">
                                            Page {historyPage} of {totalRetirementPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() =>
                                                setHistoryPage((p) => Math.min(totalRetirementPages, p + 1))
                                            }
                                            disabled={historyPage === totalRetirementPages}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Retire Dialog */}
                <Dialog open={retireDialogOpen} onOpenChange={setRetireDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Flame className="h-5 w-5 text-orange-500" />
                                Retire Carbon Credits
                            </DialogTitle>
                            <DialogDescription>
                                Retiring permanently burns your credits on-chain. This action cannot be undone.
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
                                        Lot #{selectedHolding.tokenId} •{' '}
                                        {selectedHolding.availableAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })} credits available
                                        {selectedHolding.retiredAmount > 0 && (
                                            <span className="text-orange-500 block text-xs mt-0.5">
                                                {selectedHolding.retiredAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })} already retired from this lot
                                            </span>
                                        )}
                                    </p>
                                </div>

                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                    <p className="text-sm text-destructive">
                                        Retired credits are permanently burned on the blockchain and cannot be
                                        recovered or resold. You will receive a certificate of retirement.
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="retire-amount">Amount to Retire (tonnes CO₂)</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Input
                                            id="retire-amount"
                                            type="number"
                                            min={0.001}
                                            max={selectedHolding.availableAmount}
                                            step="any"
                                            placeholder="10"
                                            value={retireAmount}
                                            onChange={(e) => setRetireAmount(e.target.value)}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setRetireAmount(selectedHolding.availableAmount.toString())}
                                            className="text-xs whitespace-nowrap">
                                            Max
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="retire-reason">Reason (optional)</Label>
                                    <Textarea
                                        id="retire-reason"
                                        placeholder="e.g. Offsetting 2025 corporate emissions"
                                        value={retireReason}
                                        onChange={(e) => setRetireReason(e.target.value)}
                                        className="mt-1"
                                        rows={2}
                                    />
                                </div>

                                {retireAmount && (
                                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
                                        <p className="text-sm text-orange-600 mb-1">You are retiring</p>
                                        <p className="text-3xl font-bold text-orange-700">
                                            {parseFloat(retireAmount || '0').toLocaleString(undefined, {
                                                maximumFractionDigits: 3
                                            })}
                                        </p>
                                        <p className="text-sm text-orange-600">tonnes of CO₂</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRetireDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleRetire}
                                disabled={retireMutation.isPending}
                                className="gap-1.5">
                                {retireMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Retiring...
                                    </>
                                ) : (
                                    <>
                                        <Flame className="h-4 w-4" />
                                        Retire Credits
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Success Dialog */}
                <Dialog open={!!successCert} onOpenChange={(open) => !open && setSuccessCert(null)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader className="text-center sm:text-center">
                            <div className="flex justify-center mb-4">
                                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <Award className="h-8 w-8 text-green-600" />
                                </div>
                            </div>
                            <DialogTitle className="text-2xl text-center">Credits Retired! 🌿</DialogTitle>
                            <DialogDescription className="text-center">
                                Your carbon credits have been permanently retired on-chain.
                            </DialogDescription>
                        </DialogHeader>

                        {successCert && (
                            <div className="space-y-4">
                                <div className="p-4 bg-muted rounded-lg text-center space-y-2">
                                    <p className="text-sm text-muted-foreground">Amount Retired</p>
                                    <p className="text-4xl font-bold">
                                        {successCert.amountRetired.toLocaleString(undefined, {
                                            maximumFractionDigits: 3
                                        })}
                                    </p>
                                    <p className="text-muted-foreground">tonnes CO₂</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Project</p>
                                        <p className="font-medium">{successCert.projectTitle}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Lot ID</p>
                                        <p className="font-mono font-medium">#{successCert.tokenId}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-muted-foreground">Transaction</p>
                                        <p className="font-mono text-xs truncate">{successCert.txHash}</p>
                                    </div>
                                </div>

                                <Button
                                    className="w-full gap-2"
                                    onClick={() => downloadRetirementCertificatePDF(successCert)}>
                                    <Download className="h-4 w-4" />
                                    Download Certificate
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
