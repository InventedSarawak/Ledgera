import { auth } from '@clerk/nextjs/server'
import { LandingPage } from '@/components/landing/LandingPage'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { redirect } from 'next/navigation'
import { SupplierDashboard } from '@/components/supplier/SupplierDashboard'
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
                <AdminDashboard />
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

    if (role === 'supplier') {
        return (
            <DashboardLayout>
                <SupplierDashboard />
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <SupplierDashboard />
        </DashboardLayout>
    )
}
