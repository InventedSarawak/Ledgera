'use client'

import { ListingCard } from '@/components/marketplace/ListingCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { listMarketplaceListings } from '@/lib/api/marketplace'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, ChevronLeft, ChevronRight, ShoppingCart, Store, Leaf, Users, Lock, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { SignInButton } from '@clerk/nextjs'

export function PublicMarketplace() {
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(12)
    const [searchQuery, setSearchQuery] = useState('')

    const { data, isLoading, error } = useQuery({
        queryKey: ['public-marketplace-listings', page, limit],
        queryFn: () => listMarketplaceListings({ page, limit })
    })

    const filteredListings =
        data?.data.filter((listing) => listing.projectTitle.toLowerCase().includes(searchQuery.toLowerCase())) || []

    const totalPages = data ? Math.ceil(data.total / limit) : 0

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50/50 to-white" />
                <div className="relative mx-auto max-w-7xl">
                    <div className="mx-auto max-w-3xl text-center">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-sm font-medium text-green-800">
                            <Leaf className="h-4 w-4" />
                            Live Carbon Credit Marketplace
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                            Trade Verified Carbon Credits{' '}
                            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                On-Chain
                            </span>
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-slate-600">
                            Browse real marketplace listings backed by blockchain provenance. Sign up to start buying or
                            selling carbon credits today.
                        </p>
                        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <SignInButton mode="modal">
                                <Button
                                    size="lg"
                                    className="gap-2 bg-green-600 hover:bg-green-700 text-base px-8 py-6 shadow-lg shadow-green-600/20">
                                    <ShoppingCart className="h-5 w-5" />
                                    Buy Carbon Credits
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </SignInButton>
                            <SignInButton mode="modal">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="gap-2 text-base px-8 py-6 border-2 border-slate-300 hover:border-green-600 hover:text-green-700">
                                    <Store className="h-5 w-5" />
                                    Sell Carbon Credits
                                </Button>
                            </SignInButton>
                        </div>
                    </div>
                </div>
            </section>

            {/* Marketplace Listings */}
            <section className="px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Active Listings</h2>
                            <p className="text-sm text-slate-500 mt-1">
                                {data?.total ?? '...'} verified carbon credit lots available
                            </p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                                <Skeleton key={i} className="h-80" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
                            <p className="text-red-600">Failed to load marketplace listings</p>
                        </div>
                    ) : filteredListings.length === 0 ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center">
                            <Leaf className="mx-auto h-12 w-12 text-slate-300" />
                            <p className="text-slate-500 text-lg mt-4">No active listings found</p>
                            <p className="text-sm text-slate-400 mt-2">
                                Check back later for new opportunities
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredListings.map((listing) => (
                                    <div key={listing.id} className="relative group">
                                        <ListingCard listing={listing} showBuyButton={false} />
                                        {/* Overlay CTA on hover */}
                                        <div className="absolute inset-0 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-lg pointer-events-none group-hover:pointer-events-auto">
                                            <SignInButton mode="modal">
                                                <Button
                                                    size="lg"
                                                    className="mb-6 gap-2 bg-green-600 hover:bg-green-700 shadow-xl">
                                                    <ShoppingCart className="h-4 w-4" />
                                                    Sign in to Buy
                                                </Button>
                                            </SignInButton>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 pt-4">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm text-slate-500">
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
                </div>
            </section>

            {/* Stats Section */}
            <section className="bg-slate-900 px-4 py-16 sm:px-6 lg:px-8 mt-12">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-8 md:grid-cols-3">
                        <div className="text-center">
                            <div className="mb-4 flex justify-center">
                                <Leaf className="h-12 w-12 text-green-500" />
                            </div>
                            <div className="text-4xl font-bold text-white">10,000+</div>
                            <div className="mt-2 text-lg text-slate-400">Tons CO₂ Offset</div>
                        </div>
                        <div className="text-center">
                            <div className="mb-4 flex justify-center">
                                <Users className="h-12 w-12 text-blue-500" />
                            </div>
                            <div className="text-4xl font-bold text-white">50+</div>
                            <div className="mt-2 text-lg text-slate-400">Verified Projects</div>
                        </div>
                        <div className="text-center">
                            <div className="mb-4 flex justify-center">
                                <Lock className="h-12 w-12 text-purple-500" />
                            </div>
                            <div className="text-4xl font-bold text-white">100%</div>
                            <div className="mt-2 text-lg text-slate-400">On-Chain Transparency</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="px-4 py-16 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-800">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-3xl font-bold text-white sm:text-4xl">
                        Ready to make an impact?
                    </h2>
                    <p className="mt-4 text-lg text-slate-300">
                        Join Ledgera today and start trading verified carbon credits on the blockchain.
                    </p>
                    <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <SignInButton mode="modal">
                            <Button
                                size="lg"
                                className="gap-2 bg-green-600 hover:bg-green-700 text-base px-8 py-6">
                                <ShoppingCart className="h-5 w-5" />
                                Start Buying
                            </Button>
                        </SignInButton>
                        <SignInButton mode="modal">
                            <Button
                                size="lg"
                                variant="outline"
                                className="gap-2 text-base px-8 py-6 border-slate-500 text-bla hover:bg-slate-700">
                                <Store className="h-5 w-5" />
                                Start Selling
                            </Button>
                        </SignInButton>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl text-center">
                    <p className="text-sm text-slate-500">
                        © {new Date().getFullYear()} Ledgera. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}
