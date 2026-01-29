'use client'

import React from 'react'
import { UserProfile } from '@clerk/nextjs'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export default function SettingsPage() {
    return (
        <DashboardLayout>
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
                    </div>
                </div>

                <div className="flex justify-center w-full mt-6">
                    <UserProfile
                        appearance={{
                            elements: {
                                rootBox: 'w-full max-w-5xl',
                                card: 'shadow-sm border border-border'
                            }
                        }}
                    />
                </div>
            </div>
        </DashboardLayout>
    )
}
