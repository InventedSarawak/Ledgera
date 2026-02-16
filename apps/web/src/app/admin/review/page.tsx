'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ProjectCard } from '@/components/marketplace/ProjectCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { getProjectsForReview, approveProject, rejectProject, mintTokens, getMyProjects } from '@/lib/api/projects'
import { Project } from '@/lib/types'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Coins, AlertCircle } from 'lucide-react'
import { useState } from 'react'

export default function AdminReviewPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | 'mint' | null>(null)
    const [mintAmount, setMintAmount] = useState('')
    const [mintAddress, setMintAddress] = useState('')
    const [rejectReason, setRejectReason] = useState('')

    const { data: pendingProjects, isLoading: loadingPending } = useQuery({
        queryKey: ['pending-projects'],
        queryFn: () => getProjectsForReview({ limit: 100 })
    })

    const { data: allProjects, isLoading: loadingAll } = useQuery({
        queryKey: ['all-projects-admin'],
        queryFn: () => getMyProjects({ limit: 100 })
    })

    const approveMutation = useMutation({
        mutationFn: (projectId: string) => approveProject(projectId),
        onSuccess: () => {
            toast({
                title: 'Project Approved',
                description: 'Project has been approved and deployed to blockchain'
            })
            queryClient.invalidateQueries({ queryKey: ['pending-projects'] })
            queryClient.invalidateQueries({ queryKey: ['all-projects-admin'] })
            setActionDialog(null)
            setSelectedProject(null)
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast({
                title: 'Approval Failed',
                description: error.response?.data?.message || 'An error occurred',
                variant: 'destructive'
            })
        }
    })

    const rejectMutation = useMutation({
        mutationFn: (projectId: string) => rejectProject(projectId),
        onSuccess: () => {
            toast({
                title: 'Project Rejected',
                description: 'Project has been rejected'
            })
            queryClient.invalidateQueries({ queryKey: ['pending-projects'] })
            queryClient.invalidateQueries({ queryKey: ['all-projects-admin'] })
            setActionDialog(null)
            setSelectedProject(null)
            setRejectReason('')
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast({
                title: 'Rejection Failed',
                description: error.response?.data?.message || 'An error occurred',
                variant: 'destructive'
            })
        }
    })

    const mintMutation = useMutation({
        mutationFn: ({ projectId, amount, toAddress }: { projectId: string; amount: number; toAddress: string }) =>
            mintTokens(projectId, amount, toAddress),
        onSuccess: () => {
            toast({
                title: 'Tokens Minted',
                description: 'Carbon credit tokens have been minted successfully'
            })
            setActionDialog(null)
            setSelectedProject(null)
            setMintAmount('')
            setMintAddress('')
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast({
                title: 'Minting Failed',
                description: error.response?.data?.message || 'An error occurred',
                variant: 'destructive'
            })
        }
    })

    const handleApprove = () => {
        if (!selectedProject) return
        approveMutation.mutate(selectedProject.id)
    }

    const handleReject = () => {
        if (!selectedProject) return
        rejectMutation.mutate(selectedProject.id)
    }

    const handleMint = () => {
        if (!selectedProject || !mintAmount || !mintAddress) {
            toast({
                title: 'Missing Information',
                description: 'Please fill in all fields',
                variant: 'destructive'
            })
            return
        }

        mintMutation.mutate({
            projectId: selectedProject.id,
            amount: parseFloat(mintAmount),
            toAddress: mintAddress
        })
    }

    const deployedProjects = allProjects?.data.filter((p) => p.status === 'DEPLOYED') || []

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Project Review & Management</h2>
                    <p className="text-muted-foreground">Review pending projects and manage token minting</p>
                </div>

                <Tabs defaultValue="pending" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="pending">Pending Review ({pendingProjects?.total || 0})</TabsTrigger>
                        <TabsTrigger value="deployed">Deployed Projects ({deployedProjects.length})</TabsTrigger>
                    </TabsList>

                    {/* Pending Projects Tab */}
                    <TabsContent value="pending" className="space-y-4">
                        {loadingPending ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-100" />
                                ))}
                            </div>
                        ) : pendingProjects?.data.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-lg font-semibold">No Pending Projects</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        All projects have been reviewed
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingProjects?.data.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        actionButtons={
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="default"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        setSelectedProject(project)
                                                        setActionDialog('approve')
                                                    }}>
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        setSelectedProject(project)
                                                        setActionDialog('reject')
                                                    }}>
                                                    <XCircle className="mr-2 h-4 w-4" />
                                                    Reject
                                                </Button>
                                            </div>
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Deployed Projects Tab */}
                    <TabsContent value="deployed" className="space-y-4">
                        {loadingAll ? (
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
                                        Approved projects will appear here
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
                                                className="w-full cursor-pointer"
                                                onClick={() => {
                                                    setSelectedProject(project)
                                                    setActionDialog('mint')
                                                }}>
                                                <Coins className="mr-2 h-4 w-4" />
                                                Mint Tokens
                                            </Button>
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Approve Dialog */}
                <Dialog open={actionDialog === 'approve'} onOpenChange={() => setActionDialog(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Approve Project</DialogTitle>
                            <DialogDescription>
                                {selectedProject && `Approve "${selectedProject.title}" and deploy to blockchain?`}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground">
                                This will automatically deploy a token contract for this project.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setActionDialog(null)}>
                                Cancel
                            </Button>
                            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
                                {approveMutation.isPending ? 'Approving...' : 'Approve & Deploy'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Reject Dialog */}
                <Dialog open={actionDialog === 'reject'} onOpenChange={() => setActionDialog(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reject Project</DialogTitle>
                            <DialogDescription>
                                {selectedProject && `Reject "${selectedProject.title}"?`}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="reason">Reason for Rejection (Optional)</Label>
                                <Textarea
                                    id="reason"
                                    placeholder="Enter reason..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setActionDialog(null)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
                                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Project'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Mint Tokens Dialog */}
                <Dialog open={actionDialog === 'mint'} onOpenChange={() => setActionDialog(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Mint Carbon Credit Tokens</DialogTitle>
                            <DialogDescription>
                                {selectedProject && `Mint tokens for "${selectedProject.title}"`}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            {selectedProject && (
                                <div className="p-3 bg-muted rounded-lg space-y-1">
                                    <p className="text-sm text-muted-foreground">Token Symbol</p>
                                    <p className="font-mono font-semibold">{selectedProject.tokenSymbol}</p>
                                    <p className="text-xs text-muted-foreground font-mono">
                                        {selectedProject.contractAddress}
                                    </p>
                                </div>
                            )}

                            <div>
                                <Label htmlFor="amount">Amount to Mint</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    placeholder="1000"
                                    value={mintAmount}
                                    onChange={(e) => setMintAmount(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="address">Recipient Address</Label>
                                <Input
                                    id="address"
                                    placeholder="0x..."
                                    value={mintAddress}
                                    onChange={(e) => setMintAddress(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setActionDialog(null)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleMint}
                                disabled={mintMutation.isPending || !mintAmount || !mintAddress}
                                className="cursor-pointer">
                                {mintMutation.isPending ? 'Minting...' : 'Mint Tokens'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
