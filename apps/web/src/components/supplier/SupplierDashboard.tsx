'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2 } from 'lucide-react'
import { useUser } from '@clerk/nextjs'

export function SupplierDashboard() {
    const { user } = useUser()

    return (
        <div className="flex h-full items-center justify-center p-8">
            <Card className="max-w-2xl w-full">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto h-16 w-16 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                        <Building2 className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-3xl">Supplier Dashboard</CardTitle>
                    <CardDescription className="text-lg">Welcome, {user?.fullName || 'Supplier'}!</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">
                        Your role: <span className="font-semibold text-foreground">Supplier</span>
                    </p>
                    <p className="text-muted-foreground">
                        Email:{' '}
                        <span className="font-semibold text-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
                    </p>
                    <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                            This is a test page. The full supplier dashboard with project management features will be
                            implemented here.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
