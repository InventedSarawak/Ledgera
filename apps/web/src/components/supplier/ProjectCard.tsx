import { useState } from 'react'
import Image from 'next/image'
import { MapPin, Ruler } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { ProjectDetailsDialog } from '@/components/supplier/ProjectDetailsDialog'
import { EditProjectDialog } from '@/components/supplier/EditProjectDialog'
import { DeleteProjectDialog } from '@/components/supplier/DeleteProjectDialog'
import axiosInstance from '@/utils/axios'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Project } from '@/lib/types'

interface ProjectCardProps {
    project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const { getToken } = useAuth()
    const queryClient = useQueryClient()

    const getStatusConfig = (status: Project['status']) => {
        switch (status) {
            case 'DRAFT':
                return {
                    label: 'Draft',
                    color: 'bg-gray-500 hover:bg-gray-600',
                    actionLabel: 'Submit for Approval',
                    actionVariant: 'default' as const,
                    actionDisabled: false
                }
            case 'PENDING':
                return {
                    label: 'Under Review',
                    color: 'bg-yellow-500 text-black hover:bg-yellow-600',
                    actionLabel: 'Under Review',
                    actionVariant: 'secondary' as const,
                    actionDisabled: true
                }
            case 'REJECTED':
                return {
                    label: 'Rejected',
                    color: 'bg-red-500 hover:bg-red-600',
                    actionLabel: 'Edit & Resubmit',
                    actionVariant: 'outline' as const,
                    actionDisabled: false
                }
            case 'APPROVED':
                return {
                    label: 'Ready to Mint',
                    color: 'bg-green-500 hover:bg-green-600',
                    actionLabel: 'Mint Tokens',
                    actionVariant: 'default' as const,
                    actionDisabled: false
                }
            case 'DEPLOYED':
                return {
                    label: 'Live',
                    color: 'bg-blue-500 hover:bg-blue-600',
                    actionLabel: 'Manage Listing',
                    actionVariant: 'outline' as const,
                    actionDisabled: false
                }
            default:
                return {
                    label: status,
                    color: 'bg-gray-500',
                    actionLabel: 'View Details',
                    actionVariant: 'ghost' as const,
                    actionDisabled: false
                }
        }
    }

    const config = getStatusConfig(project.status)

    // delete handled in DeleteProjectDialog

    const { mutate: submitProject, isPending: isSubmitting } = useMutation({
        mutationFn: async () => {
            const token = await getToken()
            await axiosInstance.post(`/projects/${project.id}/submit`, null, {
                headers: { Authorization: `Bearer ${token}` }
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', 'mine'] })
        }
    })

    return (
        <>
            <ProjectDetailsDialog project={project} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
            <EditProjectDialog open={isEditOpen} onOpenChange={setIsEditOpen} project={project} />
            <DeleteProjectDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} project={project} />
            <Card className="overflow-hidden bg-white">
                <div className="relative h-48 w-full cursor-pointer bg-gray-100" onClick={() => setIsDetailsOpen(true)}>
                    {project.imageUrl ? (
                        <Image src={project.imageUrl} alt={project.title} fill className="object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">No Image</div>
                    )}
                    <div className="absolute right-2 top-2">
                        <Badge className={config.color}>{config.label}</Badge>
                    </div>
                </div>
                <CardHeader className="cursor-pointer" onClick={() => setIsDetailsOpen(true)}>
                    <div className="flex flex-col gap-1">
                        <h3 className="line-clamp-1 text-lg font-semibold leading-none tracking-tight">
                            {project.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="line-clamp-1">
                                    {project.locationLat.toFixed(2)}, {project.locationLng.toFixed(2)}
                                </span>
                            </div>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-1">
                                <Ruler className="h-3 w-3" />
                                <span>{project.area.toFixed(2)} hectares</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="line-clamp-2 text-sm text-neutral-600">{project.description}</p>
                </CardContent>
                <CardFooter className="gap-2">
                    <Button
                        variant={config.actionVariant}
                        className="flex-1"
                        disabled={config.actionDisabled || isSubmitting}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (project.status === 'DRAFT' || project.status === 'REJECTED') {
                                submitProject()
                            } else if (project.status === 'APPROVED') {
                                console.log('Minting...')
                            } else if (project.status === 'DEPLOYED') {
                                console.log('Managing...')
                            }
                        }}>
                        {isSubmitting ? 'Submitting...' : config.actionLabel}
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1"
                        disabled={
                            project.status === 'PENDING' ||
                            project.status === 'APPROVED' ||
                            project.status === 'DEPLOYED'
                        }
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsEditOpen(true)
                        }}>
                        Edit
                    </Button>
                    <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={
                            project.status === 'PENDING' ||
                            project.status === 'APPROVED' ||
                            project.status === 'DEPLOYED'
                        }
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsDeleteOpen(true)
                        }}>
                        Delete
                    </Button>
                </CardFooter>
            </Card>
        </>
    )
}
