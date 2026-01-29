'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import axiosInstance from '@/utils/axios'
import { Project } from '@/lib/types'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Clock, XCircle, TrendingUp, Leaf, Trees } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

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

export default function AnalyticsPage() {
    const { getToken } = useAuth()

    // Fetch all projects for analytics (no limit)
    const { data: projects, isLoading } = useQuery({
        queryKey: ['projects', 'mine', 'all'],
        queryFn: async () => {
            const token = await getToken()
            const res = await axiosInstance.get<Project[]>('/projects/mine', {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: { page: 1, limit: 1000 }
            })
            return res.data
        }
    })

    const projectList = projects || []

    const pendingCount = projectList.filter((p) => p.status === 'PENDING').length
    const approvedCount = projectList.filter((p) => p.status === 'APPROVED' || p.status === 'DEPLOYED').length
    const rejectedCount = projectList.filter((p) => p.status === 'REJECTED').length
    const totalArea = projectList.reduce((acc, curr) => acc + curr.area, 0)
    const totalPotentialCarbon = totalArea * 15 // Est. 15 tons per hectare

    return (
        <DashboardLayout>
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
                        <p className="text-muted-foreground">
                            Insights into your project portfolio and environmental impact.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Area</CardTitle>
                            <Trees className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {isLoading ? <Skeleton className="h-8 w-20" /> : `${totalArea.toFixed(1)} ha`}
                            </div>
                            <p className="text-xs text-muted-foreground">Registered land area</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Carbon Potential</CardTitle>
                            <Leaf className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {isLoading ? (
                                    <Skeleton className="h-8 w-20" />
                                ) : (
                                    `${totalPotentialCarbon.toFixed(1)} tCO2e`
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">Est. annual capture</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {isLoading ? (
                                    <Skeleton className="h-8 w-20" />
                                ) : projectList.length > 0 ? (
                                    `${((approvedCount / projectList.length) * 100).toFixed(0)}%`
                                ) : (
                                    '0%'
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">Approval rate</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Project Status Distribution</CardTitle>
                            <CardDescription>Current status of all submitted projects</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                                        value={projectList.length ? (pendingCount / projectList.length) * 100 : 0}
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
                                        value={projectList.length ? (approvedCount / projectList.length) * 100 : 0}
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
                                        value={projectList.length ? (rejectedCount / projectList.length) * 100 : 0}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    )
}
