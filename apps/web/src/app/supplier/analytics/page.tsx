import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function SupplierAnalyticsPage() {
    return (
        <DashboardLayout>
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
                    <p className="text-muted-foreground">Detailed insights into your project performance</p>
                </div>

                {/* Placeholder content */}
                <div className="rounded-lg border bg-card p-8 text-center">
                    <p className="text-muted-foreground">
                        Advanced analytics coming soon. Track carbon capture metrics, revenue, credit issuance, and
                        environmental impact over time.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    )
}
