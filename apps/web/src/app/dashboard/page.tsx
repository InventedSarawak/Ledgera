'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'

import { CreateProjectDialog } from '@/components/dashboard/CreateProjectDialog'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { Skeleton } from '@/components/ui/skeleton'
import axiosInstance from '@/utils/axios'
import { Project, ApiErrorResponse } from '@/lib/types'
import { AxiosError } from 'axios'

export default function DashboardPage() {
    const { getToken } = useAuth()
    const {
        data: projects,
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey: ['projects', 'mine'],
        queryFn: async () => {
            const token = await getToken()
            const { data } = await axiosInstance.get<Project[]>('/projects/mine', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            return data
        }
    })

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Projects</h1>
                <CreateProjectDialog />
            </div>

            {/* Content */}
            {isLoading ? (
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
            ) : isError ? (
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
            ) : !projects || projects.length === 0 ? (
                <div className="flex h-100 flex-col items-center justify-center rounded-lg border border-dashed bg-gray-50 p-8 text-center animate-in fade-in-50">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                        <AlertCircle className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">No projects found</h3>
                    <p className="mt-2 text-sm text-gray-500">
                        You haven`&apos;`t created any carbon credit projects yet.
                    </p>
                    <div className="mt-6">
                        <CreateProjectDialog />
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            )}
        </div>
    )
}
