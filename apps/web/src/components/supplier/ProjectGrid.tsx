'use client'

import { AlertCircle } from 'lucide-react'
import { Project } from '@/lib/types'
import { ProjectCard } from '@/components/supplier/ProjectCard'
import { CreateProjectDialog } from '@/components/supplier/CreateProjectDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiErrorResponse } from '@/lib/types'
import { AxiosError } from 'axios'

interface ProjectGridProps {
    projects: Project[] | undefined
    isLoading: boolean
    isError: boolean
    error: Error | null
}

export function ProjectGrid({ projects, isLoading, isError, error }: ProjectGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex flex-col space-y-3">
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-62.5" />
                            <Skeleton className="h-4 w-50" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (isError) {
        return (
            <div className="rounded-md bg-red-50 p-4 text-red-500">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-semibold">Error loading projects</span>
                </div>
                <p className="mt-1 text-sm">
                    {(error as AxiosError<ApiErrorResponse>)?.response?.data?.message ||
                        'Something went wrong. Please try again.'}
                </p>
            </div>
        )
    }

    if (!projects || projects.length === 0) {
        return (
            <div className="flex h-112.5 flex-col items-center justify-center rounded-lg border border-dashed bg-gray-50 p-8 text-center animate-in fade-in-50">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <AlertCircle className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No projects found</h3>
                <p className="mt-2 text-sm text-gray-500">You haven&apos;t created any carbon credit projects yet.</p>
                <div className="mt-6">
                    <CreateProjectDialog />
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
            ))}
        </div>
    )
}
