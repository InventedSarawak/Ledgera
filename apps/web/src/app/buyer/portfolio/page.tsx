import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function BuyerPortfolioPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Portfolio</h2>
                    <p className="text-muted-foreground">View and manage your carbon credit holdings</p>
                </div>

                {/* Placeholder content */}
                <div className="rounded-lg border bg-card p-8 text-center">
                    <p className="text-muted-foreground">
                        Portfolio view coming soon. Here buyers will see their owned carbon credits, total holdings,
                        project breakdowns, and asset values.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    )
}
