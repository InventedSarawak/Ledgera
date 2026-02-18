'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wallet, ShoppingBag, Leaf, TrendingUp, ArrowRight, Loader2 } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getBuyerPurchases } from '@/lib/api/marketplace'
import { PurchaseWithDetails } from '@/lib/types'

export function BuyerDashboard() {
    const { user } = useUser()

    const { data, isLoading } = useQuery({
        queryKey: ['buyer-purchases'],
        queryFn: () => getBuyerPurchases({ page: 1, limit: 50 })
    })

    const purchases: PurchaseWithDetails[] = data?.data ?? []

    // Calculate real stats
    const totalCredits = purchases.reduce((acc, p) => acc + p.amount, 0)
    const totalSpentEth = purchases.reduce((acc, p) => acc + p.totalEth, 0)
    const uniqueProjects = new Set(purchases.map((p) => p.projectId)).size

    const stats = [
        {
            title: 'Total Credits Owned',
            value: isLoading ? '...' : totalCredits.toLocaleString(),
            description: 'Carbon credits in portfolio',
            icon: Wallet,
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-100'
        },
        {
            title: 'Projects Invested',
            value: isLoading ? '...' : uniqueProjects.toString(),
            description: 'Unique projects supported',
            icon: Leaf,
            iconColor: 'text-green-600',
            bgColor: 'bg-green-100'
        },
        {
            title: 'Total Spent',
            value: isLoading ? '...' : `${totalSpentEth.toFixed(4)} ETH`,
            description: 'Investment in carbon credits',
            icon: TrendingUp,
            iconColor: 'text-purple-600',
            bgColor: 'bg-purple-100'
        }
    ]

    const quickActions = [
        {
            title: 'Browse Credits',
            description: 'Explore verified carbon credits from various projects',
            href: '/buyer/marketplace',
            icon: ShoppingBag,
            buttonText: 'Browse Now'
        },
        {
            title: 'My Portfolio',
            description: 'View and manage your carbon credit holdings',
            href: '/buyer/portfolio',
            icon: Wallet,
            buttonText: 'View Portfolio'
        },
        {
            title: 'Retire Credits',
            description: 'Offset your carbon footprint by retiring credits',
            href: '/buyer/retire',
            icon: Leaf,
            buttonText: 'Retire Now'
        }
    ]

    // Show latest 5 purchases
    const recentPurchases = purchases.slice(0, 5)

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user?.firstName || 'Buyer'}!</h2>
                <p className="text-muted-foreground mt-2">Here&apos;s an overview of your carbon credit portfolio</p>
            </div>

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

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest transactions and updates</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : recentPurchases.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No recent activity yet. Start by browsing available carbon credits!</p>
                            <Button asChild variant="link" className="mt-2">
                                <Link href="/buyer/marketplace">Browse Credits →</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentPurchases.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Badge>Purchase</Badge>
                                        <div>
                                            <p className="font-medium">{tx.projectTitle}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(tx.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{tx.amount} Credits</p>
                                        <p className="text-sm text-muted-foreground">{tx.totalEth.toFixed(6)} ETH</p>
                                    </div>
                                </div>
                            ))}
                            <div className="text-center pt-2">
                                <Button asChild variant="link">
                                    <Link href="/buyer/transactions">View all transactions →</Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
