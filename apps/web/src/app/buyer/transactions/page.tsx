import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function BuyerTransactionsPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Transaction History</h2>
                    <p className="text-muted-foreground">View your purchase and retirement history</p>
                </div>

                {/* Placeholder content */}
                <div className="rounded-lg border bg-card p-8 text-center">
                    <p className="text-muted-foreground">
                        Transaction history coming soon. Here buyers will see all their purchases, retirements,
                        transaction dates, amounts, and blockchain confirmations.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    )
}
