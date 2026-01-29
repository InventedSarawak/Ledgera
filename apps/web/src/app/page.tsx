import { auth } from '@clerk/nextjs/server'
import { LandingPage } from '@/components/landing/LandingPage'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { AdminDashboardContent } from '@/components/admin/AdminDashboardContent'

export default async function Home() {
    const { userId, sessionClaims } = await auth()

    const metadata = sessionClaims?.metadata as CustomJwtSessionClaims['metadata'] | undefined
    const role = metadata?.role

    if (userId) {
        if (role === 'admin') {
            return (
                <DashboardLayout>
                    <AdminDashboardContent />
                </DashboardLayout>
            )
        }

        return (
            <DashboardLayout>
                <DashboardContent />
            </DashboardLayout>
        )
    }

    return <LandingPage />
}
