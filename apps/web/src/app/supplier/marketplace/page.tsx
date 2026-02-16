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
import { Project } from '@/lib/types'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, DollarSign } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function SupplierMarketplacePage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [amount, setAmount] = useState('')
    const [priceEth, setPriceEth] = useState('')

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

    const handleCreateListing = () => {
        if (!selectedProject || !amount || !priceEth) {
            toast({
                title: 'Missing Information',
                description: 'Please fill in all fields',
                variant: 'destructive'
            })
            return
        }

        createListingMutation.mutate({
            projectId: selectedProject.id,
            amount: parseFloat(amount),
            priceEth: parseFloat(priceEth)
        })
    }

    const handleCancelListing = (listingId: string) => {
        if (confirm('Are you sure you want to cancel this listing?')) {
            cancelListingMutation.mutate(listingId)
        }
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
                                                        {listing.amount} credits @ {listing.priceEth} ETH
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
                                                        {(listing.amount * listing.priceEth).toFixed(4)} ETH
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Status</p>
                                                    <p className="font-semibold">
                                                        {listing.active ? 'On Sale' : 'Sold'}
                                                    </p>
                                                </div>
                                            </div>

                                            {listing.active && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="w-full"
                                                    onClick={() => handleCancelListing(listing.id)}
                                                    disabled={cancelListingMutation.isPending}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Cancel Listing
                                                </Button>
                                            )}
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
                                <Label htmlFor="price">Price per Credit (ETH)</Label>
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
                                        {(parseFloat(amount) * parseFloat(priceEth)).toFixed(4)} ETH
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
            </div>
        </DashboardLayout>
    )
}
