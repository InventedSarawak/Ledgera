import { auth } from '@clerk/nextjs/server'
import { LandingPage } from '@/components/landing/LandingPage'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export default async function Home() {
    const { userId } = await auth()

    if (userId) {
        return (
            <DashboardLayout>
                <DashboardContent />
            </DashboardLayout>
        )
    }

    return <LandingPage />
}
