'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Leaf, TrendingUp, DollarSign, Package, Calendar, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// Mock data - In production, this would come from your API
const mockPortfolio = {
    totalCredits: 1250.5,
    totalValue: 12.505, // in ETH
    totalProjects: 3,
    projects: [
        {
            id: '1',
            projectTitle: 'Amazon Rainforest Conservation',
            tokenSymbol: 'AMZN-CC',
            amount: 500,
            purchasePrice: 0.01,
            currentPrice: 0.012,
            purchaseDate: '2026-01-15T10:30:00Z',
            contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
        },
        {
            id: '2',
            projectTitle: 'Solar Farm Initiative',
            tokenSymbol: 'SOLAR-CC',
            amount: 350.5,
            purchasePrice: 0.008,
            currentPrice: 0.009,
            purchaseDate: '2026-01-20T14:15:00Z',
            contractAddress: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
        },
        {
            id: '3',
            projectTitle: 'Mangrove Restoration',
            tokenSymbol: 'MANG-CC',
            amount: 400,
            purchasePrice: 0.007,
            currentPrice: 0.0075,
            purchaseDate: '2026-02-05T09:45:00Z',
            contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
        }
    ]
}

const mockTransactions = [
    {
        id: 't1',
        type: 'purchase',
        projectTitle: 'Mangrove Restoration',
        amount: 400,
        priceEth: 0.007,
        totalEth: 2.8,
        date: '2026-02-05T09:45:00Z',
        txHash: '0x1234...5678'
    },
    {
        id: 't2',
        type: 'purchase',
        projectTitle: 'Solar Farm Initiative',
        amount: 350.5,
        priceEth: 0.008,
        totalEth: 2.804,
        date: '2026-01-20T14:15:00Z',
        txHash: '0xabcd...efgh'
    },
    {
        id: 't3',
        type: 'purchase',
        projectTitle: 'Amazon Rainforest Conservation',
        amount: 500,
        priceEth: 0.01,
        totalEth: 5.0,
        date: '2026-01-15T10:30:00Z',
        txHash: '0x9876...4321'
    },
    {
        id: 't4',
        type: 'retirement',
        projectTitle: 'Amazon Rainforest Conservation',
        amount: 100,
        date: '2026-01-25T16:20:00Z',
        txHash: '0xfedc...8765'
    }
]

export default function BuyerPortfolioPage() {
    const totalPnL = mockPortfolio.projects.reduce((acc, p) => acc + p.amount * (p.currentPrice - p.purchasePrice), 0)
    const totalPnLPercent =
        (totalPnL / mockPortfolio.projects.reduce((acc, p) => acc + p.amount * p.purchasePrice, 0)) * 100

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Portfolio</h2>
                    <p className="text-muted-foreground">Track your carbon credit holdings and transactions</p>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Leaf className="h-4 w-4 text-green-600" />
                                Total Credits
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{mockPortfolio.totalCredits.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-1">Carbon Credits Owned</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-blue-600" />
                                Portfolio Value
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{mockPortfolio.totalValue.toFixed(4)} ETH</p>
                            <p className="text-xs text-muted-foreground mt-1">Current Market Value</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-purple-600" />
                                Total P&L
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {totalPnL >= 0 ? '+' : ''}
                                {totalPnL.toFixed(4)} ETH
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {totalPnLPercent >= 0 ? '+' : ''}
                                {totalPnLPercent.toFixed(2)}%
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-orange-600" />
                                Projects
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{mockPortfolio.totalProjects}</p>
                            <p className="text-xs text-muted-foreground mt-1">Unique Projects</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="holdings" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="holdings">Holdings</TabsTrigger>
                        <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    </TabsList>

                    {/* Holdings Tab */}
                    <TabsContent value="holdings" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Your Carbon Credit Holdings</CardTitle>
                                <CardDescription>Details of all projects in your portfolio</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {mockPortfolio.projects.map((project) => {
                                        const pnl = project.amount * (project.currentPrice - project.purchasePrice)
                                        const pnlPercent =
                                            ((project.currentPrice - project.purchasePrice) / project.purchasePrice) *
                                            100
                                        const currentValue = project.amount * project.currentPrice

                                        return (
                                            <div
                                                key={project.id}
                                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold">{project.projectTitle}</h4>
                                                        <Badge variant="outline">{project.tokenSymbol}</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground font-mono">
                                                        {project.contractAddress}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-sm">
                                                        <div>
                                                            <span className="text-muted-foreground">Amount: </span>
                                                            <span className="font-semibold">
                                                                {project.amount.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Avg Cost: </span>
                                                            <span className="font-semibold">
                                                                {project.purchasePrice} ETH
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Current: </span>
                                                            <span className="font-semibold">
                                                                {project.currentPrice} ETH
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="text-right">
                                                        <p className="text-2xl font-bold">
                                                            {currentValue.toFixed(4)} ETH
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">Current Value</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p
                                                            className={`text-sm font-semibold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {pnl >= 0 ? '+' : ''}
                                                            {pnl.toFixed(4)} ETH ({pnl >= 0 ? '+' : ''}
                                                            {pnlPercent.toFixed(2)}%)
                                                        </p>
                                                    </div>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/projects/${project.id}`}>
                                                            View Project
                                                            <ExternalLink className="ml-2 h-3 w-3" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Transactions Tab */}
                    <TabsContent value="transactions" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Transaction History</CardTitle>
                                <CardDescription>All your carbon credit transactions</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {mockTransactions.map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3">
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={tx.type === 'purchase' ? 'default' : 'secondary'}>
                                                        {tx.type === 'purchase' ? 'Purchase' : 'Retirement'}
                                                    </Badge>
                                                    <span className="font-semibold">{tx.projectTitle}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(tx.date).toLocaleString()}
                                                </div>
                                                <p className="text-xs font-mono text-muted-foreground">{tx.txHash}</p>
                                            </div>

                                            <div className="text-right">
                                                <p className="font-bold text-lg">
                                                    {tx.amount.toLocaleString()} Credits
                                                </p>
                                                {tx.type === 'purchase' && (
                                                    <p className="text-sm text-muted-foreground">
                                                        @ {tx.priceEth} ETH = {tx.totalEth} ETH
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    )
}
