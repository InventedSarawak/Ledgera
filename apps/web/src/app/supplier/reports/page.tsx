import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function SupplierReportsPage() {
    return (
        <DashboardLayout>
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Reports & Documentation</h2>
                    <p className="text-muted-foreground">Download impact assessments and certificates</p>
                </div>

                {/* Placeholder content */}
                <div className="rounded-lg border bg-card p-8 text-center">
                    <p className="text-muted-foreground">
                        Reports section coming soon. Generate and download impact assessments, verification reports, and
                        carbon credit certificates for your projects.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    )
}
