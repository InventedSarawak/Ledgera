'use client'

import React from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ShieldCheck, XCircle, AlertCircle } from 'lucide-react'
import { AxiosError } from 'axios'

import axiosInstance from '@/utils/axios'
import { ApiErrorResponse, Project } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import Image from 'next/image'

interface PendingProjectsResponse {
    projects: Project[]
    total: number
    page: number
    limit: number
}

export function AdminDashboard() {
    const { user } = useUser()
    const { getToken } = useAuth()
    const queryClient = useQueryClient()
    const [page, setPage] = React.useState(1)
    const [limit] = React.useState(6)

    const { data, isLoading, isError, error, isFetching } = useQuery<
        PendingProjectsResponse,
        AxiosError<ApiErrorResponse>,
        PendingProjectsResponse
    >({
        queryKey: ['projects', 'pending', page, limit],
        queryFn: async (): Promise<PendingProjectsResponse> => {
            const token = await getToken()
            const response = await axiosInstance.get<Project[]>('/projects/review', {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: { page, limit }
            })
            const total = Number(response.headers['x-total-count'] ?? 0)
            const hdrPage = Number(response.headers['x-page'] ?? page)
            const hdrLimit = Number(response.headers['x-limit'] ?? limit)

            return {
                projects: response.data,
                total,
                page: hdrPage,
                limit: hdrLimit
            }
        }
    })

    const performAction = React.useCallback(
        async (projectId: string, action: 'approve' | 'reject') => {
            const token = await getToken()
            await axiosInstance.post(`/projects/${projectId}/${action}`, undefined, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
        },
        [getToken]
    )

    const approveMutation = useMutation<void, AxiosError<ApiErrorResponse>, string>({
        mutationFn: async (projectId) => performAction(projectId, 'approve'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', 'pending'] })
        }
    })

    const rejectMutation = useMutation<void, AxiosError<ApiErrorResponse>, string>({
        mutationFn: async (projectId) => performAction(projectId, 'reject'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', 'pending'] })
        }
    })

    const projects = data?.projects ?? []
    const total = data?.total ?? 0
    const currentPage = data?.page ?? page
    const currentLimit = data?.limit ?? limit

    const errorMessage = error?.response?.data?.message ?? error?.message

    const renderSkeleton = () => (
        <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
                    <CardHeader className="gap-3">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-24" />
                            <Skeleton className="h-9 w-24" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user?.firstName || 'Admin'}!</h2>
                    <p className="text-muted-foreground mt-2">Review and approve pending project submissions</p>
                </div>
                <Badge variant="outline" className="flex items-center gap-2 px-4 py-2 text-sm">
                    <ShieldCheck className="size-4" />
                    {isFetching ? 'Refreshing queue…' : `${total} pending`}
                </Badge>
            </div>

            {isLoading ? (
                renderSkeleton()
            ) : isError ? (
                <Card>
                    <CardHeader className="gap-2">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="size-5" />
                            <CardTitle>Unable to load pending projects</CardTitle>
                        </div>
                        <CardDescription>{errorMessage ?? 'Please try again later.'}</CardDescription>
                    </CardHeader>
                </Card>
            ) : projects.length === 0 ? (
                <Card>
                    <CardHeader className="gap-3">
                        <CardTitle>No pending requests</CardTitle>
                        <CardDescription>New supplier submissions will appear here for review.</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {projects.map((project: Project) => {
                            const approving = approveMutation.isPending && approveMutation.variables === project.id
                            const rejecting = rejectMutation.isPending && rejectMutation.variables === project.id
                            const createdDate = new Date(project.createdAt).toLocaleDateString('en-GB')

                            return (
                                <Card key={project.id}>
                                    <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
                                        <Image
                                            src={project.imageUrl}
                                            alt={project.title}
                                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                        />
                                    </div>
                                    <CardHeader className="gap-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <CardTitle className="text-xl font-semibold">{project.title}</CardTitle>
                                            <Badge variant="outline" className="uppercase tracking-wide">
                                                {project.status.toLowerCase()}
                                            </Badge>
                                        </div>
                                        <CardDescription className="text-sm text-muted-foreground">
                                            Submitted on {createdDate}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                                            {project.description}
                                        </p>
                                        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                                            <div>
                                                <span className="font-medium text-foreground">Supplier:</span>{' '}
                                                <span title={project.supplierId}>
                                                    {project.supplierEmail ?? 'Unknown'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-foreground">Area:</span>{' '}
                                                {project.area.toFixed(2)} hectares
                                            </div>
                                            <div>
                                                <span className="font-medium text-foreground">Latitude:</span>{' '}
                                                {project.locationLat}
                                            </div>
                                            <div>
                                                <span className="font-medium text-foreground">Longitude:</span>{' '}
                                                {project.locationLng}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            <Button
                                                onClick={() => approveMutation.mutate(project.id)}
                                                disabled={approving || rejecting}>
                                                <CheckCircle2 className="size-4" />
                                                {approving ? 'Approving…' : 'Approve'}
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={() => rejectMutation.mutate(project.id)}
                                                disabled={approving || rejecting}>
                                                <XCircle className="size-4" />
                                                {rejecting ? 'Rejecting…' : 'Reject'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                    <Pagination
                        page={currentPage}
                        limit={currentLimit}
                        total={total}
                        onPageChange={(nextPage) => setPage(nextPage)}
                    />
                </>
            )}
        </div>
    )
}
