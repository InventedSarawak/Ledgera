import { useState } from 'react'
import Image from 'next/image'
import { MapPin } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { ProjectDetailsDialog } from '@/components/dashboard/ProjectDetailsDialog'
import { Project } from '@/lib/types'

interface ProjectCardProps {
    project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    const getStatusConfig = (status: Project['status']) => {
        switch (status) {
            case 'PENDING':
                return {
                    label: 'Under Review',
                    color: 'bg-yellow-500 text-black hover:bg-yellow-600',
                    actionLabel: 'Processing',
                    actionVariant: 'secondary' as const,
                    actionDisabled: true
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

    return (
        <>
            <ProjectDetailsDialog project={project} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
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
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">
                                {project.locationLat.toFixed(2)}, {project.locationLng.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="line-clamp-2 text-sm text-neutral-600">{project.description}</p>
                </CardContent>
                <CardFooter className="gap-2">
                    <Button
                        variant={config.actionVariant}
                        className="w-full"
                        disabled={config.actionDisabled}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (project.status === 'APPROVED') {
                                // Mint logic would go here
                                console.log('Minting...')
                            } else if (project.status === 'DEPLOYED') {
                                // Manage logic
                                console.log('Managing...')
                            }
                        }}>
                        {config.actionLabel}
                    </Button>
                </CardFooter>
            </Card>
        </>
    )
}
