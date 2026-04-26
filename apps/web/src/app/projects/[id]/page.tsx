'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useToast } from '@/hooks/use-toast'
import { getProject, submitProject, deleteProject } from '@/lib/api/projects'
import { createMarketplaceListing, listMarketplaceListings } from '@/lib/api/marketplace'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    MapPin,
    Leaf,
    DollarSign,
    FileCheck,
    Calendar,
    Coins,
    Send,
    Trash2,
    ShoppingCart,
    ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

const statusColors = {
    DRAFT: 'bg-gray-500',
    PENDING: 'bg-yellow-500',
    APPROVED: 'bg-blue-500',
    DEPLOYED: 'bg-green-500',
    REJECTED: 'bg-red-500'
}

export default function ProjectDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const projectId = params.id as string

    const [listingDialogOpen, setListingDialogOpen] = useState(false)
    const [amount, setAmount] = useState('')
    const [priceEth, setPriceEth] = useState('')

    const { data: project, isLoading } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => getProject(projectId)
    })

    const { data: listings } = useQuery({
        queryKey: ['project-listings', projectId],
        queryFn: () => listMarketplaceListings({ projectId }),
        enabled: !!project && project.status === 'DEPLOYED'
    })

    const submitMutation = useMutation({
        mutationFn: () => submitProject(projectId),
        onSuccess: () => {
            toast({
                title: 'Project Submitted',
                description: 'Your project has been submitted for admin review'
            })
            queryClient.invalidateQueries({ queryKey: ['project', projectId] })
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast({
                title: 'Submission Failed',
                description: error.response?.data?.message || 'An error occurred',
                variant: 'destructive'
            })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: () => deleteProject(projectId),
        onSuccess: () => {
            toast({
                title: 'Project Deleted',
                description: 'Your project has been deleted'
            })
            router.push('/supplier/projects')
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast({
                title: 'Deletion Failed',
                description: error.response?.data?.message || 'An error occurred',
                variant: 'destructive'
            })
        }
    })

    const createListingMutation = useMutation({
        mutationFn: createMarketplaceListing,
        onSuccess: () => {
            toast({
                title: 'Listing Created',
                description: 'Your carbon credits are now available on the marketplace'
            })
            queryClient.invalidateQueries({ queryKey: ['project-listings', projectId] })
            setListingDialogOpen(false)
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

    const handleCreateListing = () => {
        if (!amount || !priceEth) {
            toast({
                title: 'Missing Information',
                description: 'Please fill in all fields',
                variant: 'destructive'
            })
            return
        }

        createListingMutation.mutate({
            projectId,
            tokenId: 1, // Defaulting to 1 for standard ERC1155 base token ID, assuming backend assigns or we send 1
            amount: parseFloat(amount),
            priceEth: parseFloat(priceEth)
        })
    }

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            deleteMutation.mutate()
        }
    }

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="space-y-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </DashboardLayout>
        )
    }

    if (!project) {
        return (
            <DashboardLayout>
                <Card>
                    <CardContent className="p-12 text-center">
                        <p className="text-lg font-semibold">Project Not Found</p>
                    </CardContent>
                </Card>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Hero Section */}
                <div className="relative h-64 md:h-96 rounded-lg overflow-hidden">
                    <Image src={project.imageUrl} alt={project.title} fill className="object-cover" />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold mb-2">{project.title}</h1>
                                <p className="text-lg text-white/90">{project.description}</p>
                            </div>
                            <Badge className={`${statusColors[project.status]} text-white`}>{project.status}</Badge>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                    {project.status === 'DRAFT' && (
                        <>
                            <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                                <Send className="mr-2 h-4 w-4" />
                                Submit for Review
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push(`/supplier/projects/${projectId}/edit`)}>
                                Edit Project
                            </Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        </>
                    )}

                    {project.status === 'DEPLOYED' && (
                        <Button onClick={() => setListingDialogOpen(true)}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Create Marketplace Listing
                        </Button>
                    )}

                    {project.auditReportUrl && (
                        <Button variant="outline" asChild>
                            <Link href={project.auditReportUrl} target="_blank">
                                <FileCheck className="mr-2 h-4 w-4" />
                                View Audit Report
                                <ExternalLink className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Project Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription className="flex items-center gap-2">
                                <Leaf className="h-4 w-4 text-green-600" />
                                Carbon Credits
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{project.carbonAmount.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Total Available</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-blue-600" />
                                Price Per Tonne
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">${project.pricePerTonne}</p>
                            <p className="text-sm text-muted-foreground">USD</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-red-600" />
                                Project Area
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{project.area.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">Hectares</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-purple-600" />
                                Created
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg font-bold">
                                {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Blockchain Details */}
                {project.contractAddress && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Coins className="h-5 w-5" />
                                Blockchain Details
                            </CardTitle>
                            <CardDescription>Token contract and symbol information</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Label>Token Symbol</Label>
                                <p className="font-mono font-semibold text-lg">{project.tokenSymbol}</p>
                            </div>
                            <div>
                                <Label>Contract Address</Label>
                                <p className="font-mono text-sm break-all">{project.contractAddress}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Active Listings */}
                {listings && listings.data.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Marketplace Listings</CardTitle>
                            <CardDescription>Current listings for this project</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {listings.data.map((listing) => (
                                    <div
                                        key={listing.id}
                                        className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <p className="font-semibold">{listing.scaledAmount} Credits</p>
                                            <p className="text-sm text-muted-foreground">
                                                @ {listing.priceEth} SOL each
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">
                                                {(listing.scaledAmount * listing.priceEth).toFixed(4)} SOL
                                            </p>
                                            <Badge variant={listing.active ? 'default' : 'secondary'}>
                                                {listing.active ? 'Active' : 'Sold'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Location Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Location
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p>
                                <span className="text-muted-foreground">Latitude:</span>{' '}
                                <span className="font-mono">{project.locationLat}</span>
                            </p>
                            <p>
                                <span className="text-muted-foreground">Longitude:</span>{' '}
                                <span className="font-mono">{project.locationLng}</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Create Listing Dialog */}
                <Dialog open={listingDialogOpen} onOpenChange={setListingDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Marketplace Listing</DialogTitle>
                            <DialogDescription>
                                List carbon credits from this project on the marketplace
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
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
                                <p className="text-xs text-muted-foreground mt-1">
                                    Available: {project.carbonAmount.toLocaleString()} credits
                                </p>
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
                            <Button variant="outline" onClick={() => setListingDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateListing} disabled={createListingMutation.isPending}>
                                {createListingMutation.isPending ? 'Creating...' : 'Create Listing'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
