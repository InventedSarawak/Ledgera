'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ListingWithDetails } from '@/lib/types'
import { ShoppingCart, MapPin, Leaf } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'

interface ListingCardProps {
    listing: ListingWithDetails
    onBuy?: (listingId: string, amount: number) => void
    isLoading?: boolean
    showBuyButton?: boolean
}

export function ListingCard({ listing, onBuy, isLoading = false, showBuyButton = true }: ListingCardProps) {
    const [buyAmount, setBuyAmount] = useState<number>(listing.amount)
    const totalPrice = (buyAmount * listing.priceEth).toFixed(6)
    const isValidAmount = buyAmount > 0 && buyAmount <= listing.amount

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl">{listing.projectTitle}</CardTitle>
                        <CardDescription className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            Seller: {listing.sellerEmail}
                        </CardDescription>
                    </div>
                    {listing.active ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Sold</Badge>}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Available</p>
                        <p className="text-2xl font-bold flex items-center gap-1">
                            <Leaf className="h-5 w-5 text-green-600" />
                            {listing.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Carbon Credits</p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Price per Credit</p>
                        <p className="text-2xl font-bold">{listing.priceEth} ETH</p>
                    </div>
                </div>

                {listing.tokenSymbol && (
                    <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">Token Symbol</p>
                        <p className="font-mono text-sm font-semibold">{listing.tokenSymbol}</p>
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    Listed {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}
                </p>
            </CardContent>

            {showBuyButton && listing.active && (
                <CardFooter className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 w-full">
                        <label className="text-sm text-muted-foreground whitespace-nowrap">Qty:</label>
                        <Input
                            type="number"
                            min={1}
                            max={listing.amount}
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
                            onClick={() => setBuyAmount(listing.amount)}
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
