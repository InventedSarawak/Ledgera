'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, TrendingUp, CheckCircle2, FileText, ArrowRight, Clock, Building2, AlertCircle } from 'lucide-react'
import { useUser, useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import axiosInstance from '@/utils/axios'
import { Project } from '@/lib/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function SupplierDashboard() {
    const { user } = useUser()
    const { getToken } = useAuth()

    const { data, isLoading, isError } = useQuery({
        queryKey: ['projects', 'mine', 'overview'],
        queryFn: async () => {
            const token = await getToken()
            const res = await axiosInstance.get<Project[]>('/projects/mine', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            return res.data
        }
    })

    const projects = data || []
    const totalProjects = projects.length
    const pendingCount = projects.filter((p) => p.status === 'PENDING').length
    const approvedCount = projects.filter((p) => p.status === 'APPROVED' || p.status === 'DEPLOYED').length
    const totalArea = projects.reduce((acc, curr) => acc + curr.area, 0)

    const stats = [
        {
            title: 'Total Projects',
            value: isLoading ? <Skeleton className="h-8 w-16" /> : totalProjects.toString(),
            description: 'Registered carbon projects',
            icon: Package,
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-100'
        },
        {
            title: 'Pending Review',
            value: isLoading ? <Skeleton className="h-8 w-16" /> : pendingCount.toString(),
            description: 'Awaiting verification',
            icon: Clock,
            iconColor: 'text-yellow-600',
            bgColor: 'bg-yellow-100'
        },
        {
            title: 'Approved Projects',
            value: isLoading ? <Skeleton className="h-8 w-16" /> : approvedCount.toString(),
            description: 'Successfully verified',
            icon: CheckCircle2,
            iconColor: 'text-green-600',
            bgColor: 'bg-green-100'
        }
    ]

    const quickActions = [
        {
            title: 'Manage Projects',
            description: 'View, edit, and submit carbon credit projects',
            href: '/supplier/projects',
            icon: Package,
            buttonText: 'View Projects'
        },
        {
            title: 'Analytics',
            description: 'Track performance and impact metrics',
            href: '/supplier/analytics',
            icon: TrendingUp,
            buttonText: 'View Analytics'
        },
        {
            title: 'Reports',
            description: 'Download certificates and documentation',
            href: '/supplier/reports',
            icon: FileText,
            buttonText: 'View Reports'
        }
    ]

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user?.firstName || 'Supplier'}!</h2>
                <p className="text-muted-foreground mt-2">Here&apos;s an overview of your carbon credit projects</p>
            </div>

            {/* Error State */}
            {isError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Failed to load project data. Please try refreshing the page.</AlertDescription>
                </Alert>
            )}

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                            <div
                                className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center ${stat.iconColor}`}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">{stat.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Additional Stats Card */}
            {(isLoading || totalProjects > 0) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Impact Overview</CardTitle>
                        <CardDescription>Total environmental impact from your projects</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Land Area</p>
                                    <Skeleton className="h-10 w-32 mt-2" />
                                    <Skeleton className="h-3 w-40 mt-1" />
                                </div>
                                <div className="pt-4 border-t">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Potential Carbon Capture
                                    </p>
                                    <Skeleton className="h-10 w-32 mt-2" />
                                    <Skeleton className="h-3 w-48 mt-1" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Land Area</p>
                                    <p className="text-3xl font-bold">{totalArea.toFixed(1)} ha</p>
                                    <p className="text-xs text-muted-foreground mt-1">Hectares registered</p>
                                </div>
                                <div className="pt-4 border-t">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Potential Carbon Capture
                                    </p>
                                    <p className="text-3xl font-bold">{(totalArea * 15).toFixed(1)} tCO₂e</p>
                                    <p className="text-xs text-muted-foreground mt-1">Est. 15 tons per hectare/year</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Quick Actions */}
            <div>
                <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    {quickActions.map((action) => (
                        <Card key={action.title} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 mb-3">
                                    <action.icon className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-lg">{action.title}</CardTitle>
                                <CardDescription>{action.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild className="w-full">
                                    <Link href={action.href}>
                                        {action.buttonText}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Getting Started Section */}
            {!isLoading && totalProjects === 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>Getting Started</CardTitle>
                                <CardDescription>Begin your journey as a carbon credit supplier</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 text-sm">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-primary font-semibold text-xs">1</span>
                                </div>
                                <div>
                                    <p className="font-medium">Register Your Project</p>
                                    <p className="text-muted-foreground">
                                        Submit project details, location, and documentation
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 text-sm">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-primary font-semibold text-xs">2</span>
                                </div>
                                <div>
                                    <p className="font-medium">Verification Process</p>
                                    <p className="text-muted-foreground">Projects undergo third-party verification</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 text-sm">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-primary font-semibold text-xs">3</span>
                                </div>
                                <div>
                                    <p className="font-medium">Credits Issued</p>
                                    <p className="text-muted-foreground">
                                        Receive tokenized carbon credits upon approval
                                    </p>
                                </div>
                            </div>
                            <Button asChild className="w-full mt-4">
                                <Link href="/supplier/projects">
                                    Create Your First Project
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Projects */}
            {!isLoading && totalProjects > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Projects</CardTitle>
                        <CardDescription>Your latest submitted projects</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {projects.slice(0, 3).map((project) => (
                                <div
                                    key={project.id}
                                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`rounded-full p-2 ${
                                                project.status === 'APPROVED' || project.status === 'DEPLOYED'
                                                    ? 'bg-green-100'
                                                    : project.status === 'PENDING'
                                                      ? 'bg-yellow-100'
                                                      : 'bg-red-100'
                                            }`}>
                                            {project.status === 'APPROVED' || project.status === 'DEPLOYED' ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            ) : project.status === 'PENDING' ? (
                                                <Clock className="h-4 w-4 text-yellow-600" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 text-red-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{project.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {project.area.toFixed(1)} ha • {project.status.toLowerCase()}
                                            </p>
                                        </div>
                                    </div>
                                    <Button asChild variant="ghost" size="sm">
                                        <Link href="/supplier/projects">View</Link>
                                    </Button>
                                </div>
                            ))}
                            {totalProjects > 3 && (
                                <Button asChild variant="outline" className="w-full mt-2">
                                    <Link href="/supplier/projects">
                                        View All Projects ({totalProjects})
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
