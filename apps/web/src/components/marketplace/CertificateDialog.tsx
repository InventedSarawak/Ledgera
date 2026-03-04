import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { PurchaseWithDetails } from '@/lib/types'
import { ExternalLink, Award, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CertificateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    purchase: PurchaseWithDetails | null
}

export function CertificateDialog({ open, onOpenChange, purchase }: CertificateDialogProps) {
    if (!purchase) return null

    const explorerUrl = `https://sepolia.etherscan.io/tx/${purchase.txHash}`
    const unscaledAmount = purchase.scaledAmount / 1000

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader className="text-center sm:text-center pb-4 border-b">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <Award className="h-8 w-8 text-green-600 dark:text-green-500" />
                        </div>
                    </div>
                    <DialogTitle className="text-2xl font-serif tracking-tight text-center">
                        Certificate of Carbon Offset
                    </DialogTitle>
                    <DialogDescription className="text-center mt-2">
                        Official on-chain proof of carbon credit retirement/ownership
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-6 px-4 bg-muted/30 rounded-lg border border-border mt-4">
                    <div className="text-center space-y-2">
                        <p className="text-muted-foreground text-sm uppercase tracking-wider">Amount Retired</p>
                        <p className="text-4xl font-bold font-mono tracking-tight text-foreground">
                            {unscaledAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })} <span className="text-2xl font-normal text-muted-foreground">Tonnes</span>
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Verified Carbon Reduction
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                    <FileText className="h-3 w-3" /> Project Details
                                </p>
                                <p className="font-semibold">{purchase.projectTitle}</p>
                                {purchase.tokenSymbol && (
                                    <div className="mt-1 flex items-center gap-2">
                                        <Badge variant="outline">{purchase.tokenSymbol}</Badge>
                                        <Badge variant="secondary" className="font-mono">ERC-1155</Badge>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                    <ShieldCheck className="h-3 w-3" /> Provenance (Lot Tracking)
                                </p>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Lot Token ID:</span>
                                        <span className="font-mono font-medium">{purchase.tokenId}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Smart Contract:</span>
                                        <span className="font-mono text-xs">
                                            {purchase.tokenAddress ? `${purchase.tokenAddress.slice(0, 8)}...${purchase.tokenAddress.slice(-6)}` : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">On-Chain Transaction</p>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-background p-3 rounded-md border text-sm">
                            <div className="flex flex-col w-full min-w-0">
                                <span className="text-xs text-muted-foreground">Purchase Date</span>
                                <span className="font-medium">{new Date(purchase.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col w-full min-w-0">
                                <span className="text-xs text-muted-foreground">Transaction Hash</span>
                                <span className="font-mono truncate">{purchase.txHash.slice(0, 14)}...{purchase.txHash.slice(-10)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center mt-4">
                    <Button variant="outline" className="gap-2" onClick={() => window.open(explorerUrl, '_blank')}>
                        <ExternalLink className="h-4 w-4" /> View on Etherscan
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
