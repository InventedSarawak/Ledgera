import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function BuyerMarketplacePage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Browse Carbon Credits</h2>
                    <p className="text-muted-foreground">
                        Explore and purchase verified carbon credits from various projects
                    </p>
                </div>

                {/* Placeholder content */}
                <div className="rounded-lg border bg-card p-8 text-center">
                    <p className="text-muted-foreground">
                        Marketplace functionality coming soon. Here buyers will be able to browse available carbon
                        credits, filter by project type, region, price, and make purchases.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    )
}
