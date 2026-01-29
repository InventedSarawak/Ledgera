import { auth } from '@clerk/nextjs/server'
import { LandingPage } from '@/components/landing/LandingPage'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { AdminDashboardContent } from '@/components/admin/AdminDashboardContent'
import { redirect } from 'next/navigation'
// import { SupplierDashboard } from '@/components/supplier/SupplierDashboard'
import { BuyerDashboard } from '@/components/buyer/BuyerDashboard'

export default async function Home() {
    const { userId, sessionClaims } = await auth()

    if (!userId) {
        return <LandingPage />
    }

    const metadata = sessionClaims?.metadata as CustomJwtSessionClaims['metadata'] | undefined
    const role = metadata?.role

    if (!role) {
        redirect('/onboarding')
    }

    if (role === 'admin') {
        return (
            <DashboardLayout>
                <AdminDashboardContent />
            </DashboardLayout>
        )
    }

    if (role === 'buyer') {
        return (
            <DashboardLayout>
                <BuyerDashboard />
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <DashboardContent />
        </DashboardLayout>
    )
}
