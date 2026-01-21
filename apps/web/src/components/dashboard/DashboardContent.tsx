'use client'

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
import { AxiosError } from 'axios'

export function DashboardContent() {
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

    const pendingCount = projects?.filter((p) => p.status === 'PENDING').length || 0

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
                            {isLoading ? <Skeleton className="h-8 w-20" /> : projects?.length || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">+0% from last month</p>
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
                        <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0 TCO2</div>
                        <p className="text-xs text-muted-foreground">Lifetime carbon credits</p>
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
                </TabsContent>
            </Tabs>
        </div>
    )
}
