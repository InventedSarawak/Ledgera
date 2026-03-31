'use client'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ListingWithDetails } from '@/lib/types'
import { ShoppingCart, Leaf } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import Image from 'next/image'

interface ListingCardProps {
    listing: ListingWithDetails
    onBuy?: (listingId: string, amount: number) => void
    isLoading?: boolean
    showBuyButton?: boolean
}

export function ListingCard({ listing, onBuy, isLoading = false, showBuyButton = true }: ListingCardProps) {
    const availableAmount = listing.scaledAmount / 1000
    const [buyAmount, setBuyAmount] = useState<number>(availableAmount)
    const totalPrice = (buyAmount * listing.priceEth).toFixed(6)
    const isValidAmount = buyAmount > 0 && buyAmount <= availableAmount

    // Truncate description
    const shortDescription =
        listing.projectDescription && listing.projectDescription.length > 120
            ? listing.projectDescription.slice(0, 120) + '...'
            : listing.projectDescription || ''

    return (
        <Card className="hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
            {/* Project Image */}
            {listing.projectImageUrl && (
                <div className="relative w-full h-44 bg-muted">
                    <Image
                        src={listing.projectImageUrl}
                        alt={listing.projectTitle}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                </div>
            )}

            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                        <CardTitle className="text-lg leading-tight">{listing.projectTitle}</CardTitle>
                        <p className="text-xs text-muted-foreground">Seller: {listing.sellerEmail}</p>
                    </div>
                    {listing.active ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Sold</Badge>}
                </div>
            </CardHeader>

            <CardContent className="space-y-3 flex-1">
                {/* Description */}
                {shortDescription && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{shortDescription}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Available</p>
                        <p className="text-xl font-bold flex items-center gap-1">
                            <Leaf className="h-4 w-4 text-green-600" />
                            {availableAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                        </p>
                        <p className="text-xs text-muted-foreground">Credits</p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Price per Credit</p>
                        <p className="text-xl font-bold">{listing.priceEth} ETH</p>
                    </div>
                </div>

                {listing.tokenSymbol && (
                    <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Token</p>
                                <p className="font-mono text-sm font-semibold">{listing.tokenSymbol}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">Lot ID</p>
                                <p className="font-mono text-sm font-semibold">#{listing.tokenId}</p>
                            </div>
                        </div>
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    Listed {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}
                </p>
            </CardContent>

            {showBuyButton && listing.active && (
                <CardFooter className="flex flex-col gap-3 pt-0">
                    <div className="flex items-center gap-2 w-full">
                        <label className="text-sm text-muted-foreground whitespace-nowrap">Qty:</label>
                        <Input
                            type="number"
                            min={0.001}
                            max={availableAmount}
                            step="any"
                            value={buyAmount}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value)
                                if (!isNaN(val)) setBuyAmount(val)
                            }}
                            className="w-28"
                            disabled={isLoading}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBuyAmount(availableAmount)}
                            disabled={isLoading}
                            className="text-xs">
                            Max
                        </Button>
                    </div>
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={() => onBuy?.(listing.id, buyAmount)}
                        disabled={isLoading || !isValidAmount}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {isLoading ? 'Processing...' : `Buy ${buyAmount} for ${totalPrice} ETH`}
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}
