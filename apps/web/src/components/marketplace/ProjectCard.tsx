'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Project } from '@/lib/types'
import { MapPin, Leaf, DollarSign, FileCheck, Calendar, Coins } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import Image from 'next/image'

interface ProjectCardProps {
    project: Project
    showActions?: boolean
    actionButtons?: React.ReactNode
}

const statusColors = {
    DRAFT: 'bg-gray-500',
    PENDING: 'bg-yellow-500',
    APPROVED: 'bg-blue-500',
    DEPLOYED: 'bg-green-500',
    REJECTED: 'bg-red-500'
}

export function ProjectCard({ project, showActions = true, actionButtons }: ProjectCardProps) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-48 w-full">
                <Image
                    src={project.imageUrl || '/placeholder-project.jpg'}
                    alt={project.title}
                    fill
                    className="object-cover"
                />
                <div className="absolute top-2 right-2">
                    <Badge className={statusColors[project.status]}>{project.status}</Badge>
                </div>
            </div>

            <CardHeader>
                <CardTitle className="text-xl line-clamp-1">{project.title}</CardTitle>
                <CardDescription className="line-clamp-2">{project.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-green-600" />
                        <div>
                            <p className="font-semibold">{project.carbonAmount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Carbon Credits</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        <div>
                            <p className="font-semibold">${project.pricePerTonne}</p>
                            <p className="text-xs text-muted-foreground">Per Tonne</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-red-600" />
                        <div>
                            <p className="font-semibold">{project.area.toFixed(2)} ha</p>
                            <p className="text-xs text-muted-foreground">Area</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <div>
                            <p className="font-semibold text-xs">
                                {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                            </p>
                            <p className="text-xs text-muted-foreground">Created</p>
                        </div>
                    </div>
                </div>

                {project.contractAddress && (
                    <div className="pt-2 border-t space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Coins className="h-3 w-3" />
                            <span>Token: {project.tokenSymbol}</span>
                        </div>
                        <p className="font-mono text-xs truncate" title={project.contractAddress}>
                            {project.contractAddress}
                        </p>
                    </div>
                )}

                {project.auditReportUrl && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileCheck className="h-3 w-3" />
                        <Link href={project.auditReportUrl} target="_blank" className="text-blue-600 hover:underline">
                            View Audit Report
                        </Link>
                    </div>
                )}
            </CardContent>

            {showActions && (
                <CardFooter>
                    {actionButtons || (
                        <Button asChild className="w-full">
                            <Link href={`/projects/${project.id}`}>View Details</Link>
                        </Button>
                    )}
                </CardFooter>
            )}
        </Card>
    )
}
