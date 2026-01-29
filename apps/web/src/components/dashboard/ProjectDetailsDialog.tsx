import Image from 'next/image'
import { Calendar, FileText, Globe, MapPin, ShieldCheck, Coins, Ruler } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Project } from '@/lib/types'

interface ProjectDetailsDialogProps {
    project: Project
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ProjectDetailsDialog({ project, open, onOpenChange }: ProjectDetailsDialogProps) {
    const isDeployed = project.status === 'DEPLOYED'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
                <div className="relative h-64 w-full bg-slate-100">
                    {project.imageUrl ? (
                        <Image src={project.imageUrl} alt={project.title} fill className="object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                            No Image Available
                        </div>
                    )}
                    <div className="absolute right-4 top-4">
                        <Badge
                            className={
                                isDeployed
                                    ? 'bg-green-500 hover:bg-green-600'
                                    : 'bg-yellow-500 text-black hover:bg-yellow-600'
                            }>
                            {project.status}
                        </Badge>
                    </div>
                </div>

                <div className="flex flex-col gap-6 p-6">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-slate-900">{project.title}</DialogTitle>
                        <DialogDescription className="flex items-center gap-2 text-slate-500">
                            <MapPin className="h-4 w-4" />
                            {project.locationLat.toFixed(4)}, {project.locationLng.toFixed(4)}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[40vh] pr-4">
                        <div className="space-y-6">
                            {/* Description */}
                            <div className="space-y-2">
                                <h4 className="flex items-center gap-2 font-semibold text-slate-900">
                                    <FileText className="h-4 w-4 text-slate-500" />
                                    Description
                                </h4>
                                <p className="text-sm leading-relaxed text-slate-600">{project.description}</p>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="rounded-lg border border-slate-200 p-3">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                        <Calendar className="h-4 w-4 text-slate-500" />
                                        Created At
                                    </div>
                                    <div className="mt-1 text-sm text-slate-600">
                                        {new Date(project.createdAt).toLocaleDateString(undefined, {
                                            dateStyle: 'long'
                                        })}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-200 p-3">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                        <Globe className="h-4 w-4 text-slate-500" />
                                        Location Coordinates
                                    </div>
                                    <div className="mt-1 text-sm text-slate-600">
                                        {project.locationLat}, {project.locationLng}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-200 p-3">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                        <Ruler className="h-4 w-4 text-slate-500" />
                                        Area (hectares)
                                    </div>
                                    <div className="mt-1 text-sm text-slate-600">
                                        {project.area?.toFixed ? project.area.toFixed(2) : project.area} hectares
                                    </div>
                                </div>

                                {project.tokenSymbol && (
                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                            <Coins className="h-4 w-4 text-slate-500" />
                                            Token Symbol
                                        </div>
                                        <div className="mt-1 font-mono text-sm text-slate-600">
                                            {project.tokenSymbol}
                                        </div>
                                    </div>
                                )}

                                {project.contractAddress && (
                                    <div className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                            <ShieldCheck className="h-4 w-4 text-slate-500" />
                                            Contract Address
                                        </div>
                                        <div className="mt-1 break-all font-mono text-xs text-slate-600">
                                            {project.contractAddress}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    )
}
