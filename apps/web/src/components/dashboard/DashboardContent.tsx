'use client'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'

import { CreateProjectDialog } from '@/components/dashboard/CreateProjectDialog'
import { ProjectGrid } from '@/components/dashboard/ProjectGrid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, CreditCard, Package } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import axiosInstance from '@/utils/axios'
import { Project } from '@/lib/types'
import { Pagination } from '@/components/ui/pagination'
import { AxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle2, Clock, XCircle, Download } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CardDescription } from '@/components/ui/card'

function SimpleProgress({ value }: { value: number }) {
    return (
        <div className="h-2 w-full rounded-full bg-secondary/20">
            <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
                style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
            />
        </div>
    )
}

export function DashboardContent() {
    const { getToken } = useAuth()
    const [page, setPage] = React.useState(1)
    const [limit] = React.useState(6)
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
    const projects = data?.projects || []
    const total = data?.total ?? 0
    const currentPage = data?.page ?? page
    const currentLimit = data?.limit ?? limit

    // Derived Stats
    const pendingCount = projects.filter((p) => p.status === 'PENDING').length
    const approvedCount = projects.filter((p) => p.status === 'APPROVED' || p.status === 'DEPLOYED').length
    const rejectedCount = projects.filter((p) => p.status === 'REJECTED').length
    const totalArea = projects.reduce((acc, curr) => acc + curr.area, 0)

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <div className="flex items-center space-x-2">
                    <CreateProjectDialog />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? <Skeleton className="h-8 w-20" /> : projects.length}
                        </div>
                        <p className="text-xs text-muted-foreground">in current view</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? <Skeleton className="h-8 w-20" /> : pendingCount}
                        </div>
                        <p className="text-xs text-muted-foreground">Projects awaiting approval</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Area</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? <Skeleton className="h-8 w-20" /> : `${totalArea.toFixed(1)} ha`}
                        </div>
                        <p className="text-xs text-muted-foreground">Total land area registered</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
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
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Project Status Distribution</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="space-y-8 p-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-yellow-500" />
                                                <span>Pending Review</span>
                                            </div>
                                            <span className="font-medium">{pendingCount}</span>
                                        </div>
                                        <SimpleProgress
                                            value={projects.length ? (pendingCount / projects.length) * 100 : 0}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                <span>Approved & Deployed</span>
                                            </div>
                                            <span className="font-medium">{approvedCount}</span>
                                        </div>
                                        <SimpleProgress
                                            value={projects.length ? (approvedCount / projects.length) * 100 : 0}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="h-4 w-4 text-red-500" />
                                                <span>Rejected</span>
                                            </div>
                                            <span className="font-medium">{rejectedCount}</span>
                                        </div>
                                        <SimpleProgress
                                            value={projects.length ? (rejectedCount / projects.length) * 100 : 0}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Impact Metrics</CardTitle>
                                <CardDescription>Estimated metrics based on area</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-8">
                                    <div className="flex items-center">
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none">Potential Carbon Capture</p>
                                            <p className="text-2xl font-bold">{(totalArea * 15).toFixed(1)} tCO2e</p>
                                            <p className="text-xs text-muted-foreground">
                                                Est. 15 tons per hectare/year
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none">Biodiversity Score</p>
                                            <p className="text-2xl font-bold">High</p>
                                            <p className="text-xs text-muted-foreground">Based on location data</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="reports" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Generated Reports</CardTitle>
                            <CardDescription>
                                Download documentation and certificates for your projects.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {projects
                                    .filter((p) => p.status === 'APPROVED' || p.status === 'DEPLOYED')
                                    .map((p) => (
                                        <div
                                            key={p.id}
                                            className="flex items-center justify-between rounded-lg border p-4">
                                            <div className="flex items-center gap-4">
                                                <div className="rounded-full bg-primary/10 p-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Impact Assessment: {p.title}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Generated on {new Date(p.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button variant="outline" size="sm">
                                                <Download className="mr-2 h-4 w-4" />
                                                Download
                                            </Button>
                                        </div>
                                    ))}
                                {!projects.some((p) => p.status === 'APPROVED' || p.status === 'DEPLOYED') && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No reports available. Reports are generated for approved projects.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Updates concerning your account and projects.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-100 pr-4">
                                <div className="space-y-4">
                                    {projects.map((p) => (
                                        <div
                                            key={p.id}
                                            className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0">
                                            <span className="relative flex h-2 w-2 translate-y-2 rounded-full bg-sky-500" />
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium leading-none">
                                                    Project &ldquo;{p.title}&rdquo; Submitted
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Status: <span className="lowercase">{p.status}</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(p.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {projects.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No recent notifications.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
