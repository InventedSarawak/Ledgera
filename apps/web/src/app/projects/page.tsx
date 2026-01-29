'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import axiosInstance from '@/utils/axios'
import { Project } from '@/lib/types'
import { ProjectGrid } from '@/components/dashboard/ProjectGrid'
import { CreateProjectDialog } from '@/components/dashboard/CreateProjectDialog'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Pagination } from '@/components/ui/pagination'
import { AxiosError } from 'axios'

export default function ProjectsPage() {
    const { getToken } = useAuth()
    const [page, setPage] = React.useState(1)
    const [limit] = React.useState(9) // Display more on the dedicated page

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['projects', 'mine', page, limit],
        queryFn: async () => {
            const token = await getToken()
            const res = await axiosInstance.get<Project[]>('/projects/mine', {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: { page, limit }
            })
            const total = Number(res.headers['x-total-count'] ?? 0)
            const hdrPage = Number(res.headers['x-page'] ?? page)
            const hdrLimit = Number(res.headers['x-limit'] ?? limit)
            return { projects: res.data, total, page: hdrPage, limit: hdrLimit }
        }
    })

    const projects = data?.projects
    const total = data?.total ?? 0
    const currentPage = data?.page ?? page
    const currentLimit = data?.limit ?? limit

    return (
        <DashboardLayout>
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
                        <p className="text-muted-foreground">Manage your carbon credit projects.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <CreateProjectDialog />
                    </div>
                </div>
                <div className="space-y-4">
                    <ProjectGrid
                        projects={projects}
                        isLoading={isLoading}
                        isError={isError}
                        error={error as AxiosError | null}
                    />
                    <Pagination
                        page={currentPage}
                        limit={currentLimit}
                        total={total}
                        onPageChange={(p) => setPage(p)}
                    />
                </div>
            </div>
        </DashboardLayout>
    )
}
