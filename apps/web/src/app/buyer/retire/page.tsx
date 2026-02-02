import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export default function BuyerRetirePage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Retire Credits</h2>
                    <p className="text-muted-foreground">Offset your carbon footprint by retiring credits</p>
                </div>

                {/* Placeholder content */}
                <div className="rounded-lg border bg-card p-8 text-center">
                    <p className="text-muted-foreground">
                        Credit retirement coming soon. Here buyers will be able to retire their carbon credits to offset
                        emissions, receive retirement certificates, and view retirement history.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    )
}
