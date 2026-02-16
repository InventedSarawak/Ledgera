'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ListingWithDetails } from '@/lib/types'
import { ShoppingCart, MapPin, Leaf } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ListingCardProps {
    listing: ListingWithDetails
    onBuy?: (listingId: string) => void
    isLoading?: boolean
    showBuyButton?: boolean
}

export function ListingCard({ listing, onBuy, isLoading = false, showBuyButton = true }: ListingCardProps) {
    const totalPrice = (listing.amount * listing.priceEth).toFixed(4)

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
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="text-2xl font-bold flex items-center gap-1">
                            <Leaf className="h-5 w-5 text-green-600" />
                            {listing.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Carbon Credits</p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Price per Credit</p>
                        <p className="text-2xl font-bold">{listing.priceEth} ETH</p>
                        <p className="text-xs text-muted-foreground">Total: {totalPrice} ETH</p>
                    </div>
                </div>

                {listing.tokenAddress && (
                    <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">Token Symbol</p>
                        <p className="font-mono text-sm font-semibold">{listing.tokenSymbol || 'N/A'}</p>
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    Listed {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}
                </p>
            </CardContent>

            {showBuyButton && listing.active && (
                <CardFooter>
                    <Button className="w-full" size="lg" onClick={() => onBuy?.(listing.id)} disabled={isLoading}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {isLoading ? 'Processing...' : `Buy for ${totalPrice} ETH`}
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}
