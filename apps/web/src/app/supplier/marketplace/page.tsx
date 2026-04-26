'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ProjectCard } from '@/components/marketplace/ProjectCard'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { getMyProjects } from '@/lib/api/projects'
import { createMarketplaceListing, listMarketplaceListings, cancelMarketplaceListing } from '@/lib/api/marketplace'
import { Project, ListingWithDetails } from '@/lib/types'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, DollarSign, Eye, Coins, MapPin, Leaf, FileCheck, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getPolygonCentroid } from '@/lib/utils'

export default function SupplierMarketplacePage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [selectedListing, setSelectedListing] = useState<ListingWithDetails | null>(null)
    const [amount, setAmount] = useState('')
    const [priceEth, setPriceEth] = useState('')
    const [tokenId, setTokenId] = useState('0')
    const [copied, setCopied] = useState(false)

    // Fetch deployed projects (only these can be listed)
    const { data: projects, isLoading: loadingProjects } = useQuery({
        queryKey: ['my-projects'],
        queryFn: () => getMyProjects({ limit: 100 })
    })

    // Fetch my active listings
    const { data: listings, isLoading: loadingListings } = useQuery({
        queryKey: ['my-marketplace-listings'],
        queryFn: () => listMarketplaceListings({ limit: 100 })
    })

    const createListingMutation = useMutation({
        mutationFn: createMarketplaceListing,
        onSuccess: () => {
            toast({
                title: 'Listing Created',
                description: 'Your carbon credits are now available on the marketplace'
            })
            queryClient.invalidateQueries({ queryKey: ['my-marketplace-listings'] })
            setCreateDialogOpen(false)
            setSelectedProject(null)
            setAmount('')
            setPriceEth('')
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast({
                title: 'Failed to Create Listing',
                description: error.response?.data?.message || 'An error occurred',
                variant: 'destructive'
            })
        }
    })

    const cancelListingMutation = useMutation({
        mutationFn: cancelMarketplaceListing,
        onSuccess: () => {
            toast({
                title: 'Listing Cancelled',
                description: 'Your listing has been removed from the marketplace'
            })
            queryClient.invalidateQueries({ queryKey: ['my-marketplace-listings'] })
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast({
                title: 'Failed to Cancel Listing',
                description: error.response?.data?.message || 'An error occurred',
                variant: 'destructive'
            })
        }
    })

    const deployedProjects = projects?.data.filter((p) => p.status === 'DEPLOYED') || []

    // Find project details for a listing
    const getProjectForListing = (listing: ListingWithDetails): Project | undefined => {
        return projects?.data.find((p) => p.id === listing.projectId)
    }

    const handleCreateListing = () => {
        if (!selectedProject || !amount || !priceEth || !tokenId) {
            toast({
                title: 'Missing Information',
                description: 'Please fill in all fields',
                variant: 'destructive'
            })
            return
        }

        createListingMutation.mutate({
            projectId: selectedProject.id,
            tokenId: parseInt(tokenId, 10),
            amount: parseFloat(amount),
            priceEth: parseFloat(priceEth)
        })
    }

    const handleCancelListing = (listingId: string) => {
        if (confirm('Are you sure you want to cancel this listing?')) {
            cancelListingMutation.mutate(listingId)
        }
    }

    const handleViewDetails = (listing: ListingWithDetails) => {
        setSelectedListing(listing)
        setDetailsDialogOpen(true)
        setCopied(false)
    }

    const handleCopyAddress = (address: string) => {
        navigator.clipboard.writeText(address)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Marketplace Management</h2>
                        <p className="text-muted-foreground">Create and manage your carbon credit listings</p>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)} disabled={deployedProjects.length === 0}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Listing
                    </Button>
                </div>

                <Tabs defaultValue="listings" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="listings">My Listings</TabsTrigger>
                        <TabsTrigger value="projects">Available Projects</TabsTrigger>
                    </TabsList>

                    {/* My Listings Tab */}
                    <TabsContent value="listings" className="space-y-4">
                        {loadingListings ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-75" />
                                ))}
                            </div>
                        ) : listings?.data.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-lg font-semibold">No Active Listings</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Create your first listing to start selling carbon credits
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {listings?.data.map((listing) => (
                                    <Card key={listing.id}>
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-lg">{listing.projectTitle}</CardTitle>
                                                    <CardDescription>
                                                        {(listing.scaledAmount / 1000).toLocaleString(undefined, {
                                                            maximumFractionDigits: 3
                                                        })}{' '}
                                                        credits @ {listing.priceEth} SOL
                                                    </CardDescription>
                                                </div>
                                                <Badge variant={listing.active ? 'default' : 'secondary'}>
                                                    {listing.active ? 'Active' : 'Sold'}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Total Value</p>
                                                    <p className="font-bold text-lg">
                                                        {((listing.scaledAmount / 1000) * listing.priceEth).toFixed(4)}{' '}
                                                        SOL
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Status</p>
                                                    <p className="font-semibold">
                                                        {listing.active ? 'On Sale' : 'Sold'}
                                                    </p>
                                                </div>
                                            </div>

                                            {listing.tokenSymbol && (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Coins className="h-3 w-3" />
                                                    <span>Token: {listing.tokenSymbol}</span>
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleViewDetails(listing)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View Details
                                                </Button>
                                                {listing.active && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => handleCancelListing(listing.id)}
                                                        disabled={cancelListingMutation.isPending}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Cancel
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Available Projects Tab */}
                    <TabsContent value="projects" className="space-y-4">
                        {loadingProjects ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-100" />
                                ))}
                            </div>
                        ) : deployedProjects.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <p className="text-lg font-semibold">No Deployed Projects</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        You need deployed projects before you can create marketplace listings
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {deployedProjects.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        actionButtons={
                                            <Button
                                                className="w-full"
                                                onClick={() => {
                                                    setSelectedProject(project)
                                                    setCreateDialogOpen(true)
                                                }}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create Listing
                                            </Button>
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Create Listing Dialog */}
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Marketplace Listing</DialogTitle>
                            <DialogDescription>
                                {selectedProject
                                    ? `List carbon credits from "${selectedProject.title}"`
                                    : 'Select a project to create a listing'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {!selectedProject && (
                                <div>
                                    <Label>Select Project</Label>
                                    <select
                                        className="w-full mt-2 p-2 border rounded"
                                        onChange={(e) => {
                                            const project = deployedProjects.find((p) => p.id === e.target.value)
                                            setSelectedProject(project || null)
                                        }}>
                                        <option value="">Choose a project...</option>
                                        {deployedProjects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <Label htmlFor="tokenId">Lot / Token ID</Label>
                                <Input
                                    id="tokenId"
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    value={tokenId}
                                    onChange={(e) => setTokenId(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="amount">Amount of Carbon Credits</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    placeholder="100"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="price">Price per Credit (SOL)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.0001"
                                    placeholder="0.01"
                                    value={priceEth}
                                    onChange={(e) => setPriceEth(e.target.value)}
                                />
                            </div>

                            {amount && priceEth && (
                                <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-sm text-muted-foreground">Total Value</p>
                                    <p className="text-2xl font-bold">
                                        {(parseFloat(amount) * parseFloat(priceEth)).toFixed(4)} SOL
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateListing} disabled={createListingMutation.isPending}>
                                {createListingMutation.isPending ? 'Creating...' : 'Create Listing'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View Details Dialog */}
                <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Listing Details</DialogTitle>
                            <DialogDescription>{selectedListing?.projectTitle}</DialogDescription>
                        </DialogHeader>

                        {selectedListing &&
                            (() => {
                                const project = getProjectForListing(selectedListing)
                                return (
                                    <div className="space-y-5">
                                        {/* Listing Stats */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-muted rounded-lg">
                                                <p className="text-xs text-muted-foreground">Credits Listed</p>
                                                <p className="text-xl font-bold">
                                                    {(selectedListing.scaledAmount / 1000).toLocaleString(undefined, {
                                                        maximumFractionDigits: 3
                                                    })}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <p className="text-xs text-muted-foreground">Price / Credit</p>
                                                <p className="text-xl font-bold">{selectedListing.priceEth} SOL</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <p className="text-xs text-muted-foreground">Total Value</p>
                                                <p className="text-xl font-bold">
                                                    {(
                                                        (selectedListing.scaledAmount / 1000) *
                                                        selectedListing.priceEth
                                                    ).toFixed(4)}{' '}
                                                    SOL
                                                </p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <p className="text-xs text-muted-foreground">Status</p>
                                                <Badge
                                                    variant={selectedListing.active ? 'default' : 'secondary'}
                                                    className="mt-1">
                                                    {selectedListing.active ? 'Active' : 'Sold'}
                                                </Badge>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Token Information */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                <Coins className="h-4 w-4" />
                                                Token Information
                                            </h4>
                                            {selectedListing.tokenSymbol ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-muted-foreground">Symbol</span>
                                                        <Badge variant="outline">{selectedListing.tokenSymbol}</Badge>
                                                    </div>
                                                    {selectedListing.tokenAddress && (
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-sm text-muted-foreground">
                                                                Contract
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs font-mono truncate max-w-[200px]">
                                                                    {selectedListing.tokenAddress}
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 shrink-0"
                                                                    onClick={() =>
                                                                        handleCopyAddress(selectedListing.tokenAddress!)
                                                                    }>
                                                                    {copied ? (
                                                                        <Check className="h-3 w-3 text-green-500" />
                                                                    ) : (
                                                                        <Copy className="h-3 w-3" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">Token not yet deployed</p>
                                            )}
                                        </div>

                                        <Separator />

                                        {/* Project Metadata */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                <Leaf className="h-4 w-4" />
                                                Project Details
                                            </h4>

                                            {project ? (
                                                <div className="space-y-2 text-sm">
                                                    <p className="text-muted-foreground line-clamp-3">
                                                        {project.description}
                                                    </p>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <Leaf className="h-3 w-3 text-green-600" />
                                                            <span>
                                                                <strong>{project.carbonAmount.toLocaleString()}</strong>{' '}
                                                                tCO2e
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="h-3 w-3 text-red-600" />
                                                            <span>
                                                                <strong>{project.area.toFixed(1)}</strong> ha
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <DollarSign className="h-3 w-3 text-blue-600" />
                                                            <span>${project.pricePerTonne}/tonne</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="h-3 w-3 text-purple-600" />
                                                            <span className="text-xs">
                                                                {getPolygonCentroid(
                                                                    project.locationPolygon
                                                                ).lat.toFixed(4)}
                                                                ,{' '}
                                                                {getPolygonCentroid(
                                                                    project.locationPolygon
                                                                ).lng.toFixed(4)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {project.auditReportUrl && (
                                                        <div className="flex items-center gap-2 pt-1">
                                                            <FileCheck className="h-3 w-3 text-green-600" />
                                                            <a
                                                                href={project.auditReportUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 hover:underline text-xs">
                                                                View Audit Report
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    Project details not available in current view
                                                </p>
                                            )}
                                        </div>

                                        {/* Listing Meta */}
                                        <Separator />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>
                                                Listed: {new Date(selectedListing.createdAt).toLocaleDateString()}
                                            </span>
                                            <span>ID: {selectedListing.id.slice(0, 8)}...</span>
                                        </div>
                                    </div>
                                )
                            })()}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
