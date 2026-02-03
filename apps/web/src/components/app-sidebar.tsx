'use client'

import * as React from 'react'
import {
    LayoutDashboard,
    FolderKanban,
    LineChart,
    Command,
    ShieldCheck,
    ShoppingBag,
    Wallet,
    History,
    Leaf,
    FileText,
    CheckCircle2
} from 'lucide-react'

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarFooter
} from '@/components/ui/sidebar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { NavUser } from '@/components/nav-user'
import { Roles } from '@/types/globals'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const { user } = useUser()

    const role = (user?.publicMetadata?.role as Roles | undefined) ?? 'buyer'
    const items = React.useMemo(() => {
        if (role === 'admin') {
            return [
                {
                    title: 'Review Queue',
                    url: '/',
                    icon: ShieldCheck
                },
                {
                    title: 'Analytics',
                    url: '/analytics',
                    icon: LineChart
                }
            ]
        }

        if (role === 'buyer') {
            return [
                {
                    title: 'Overview',
                    url: '/',
                    icon: LayoutDashboard
                },
                {
                    title: 'Browse Credits',
                    url: '/buyer/marketplace',
                    icon: ShoppingBag
                },
                {
                    title: 'My Portfolio',
                    url: '/buyer/portfolio',
                    icon: Wallet
                },
                {
                    title: 'Transactions',
                    url: '/buyer/transactions',
                    icon: History
                },
                {
                    title: 'Retire Credits',
                    url: '/buyer/retire',
                    icon: Leaf
                }
            ]
        }

        // Default to Supplier menu
        return [
            {
                title: 'Overview',
                url: '/',
                icon: LayoutDashboard
            },
            {
                title: 'Projects',
                url: '/supplier/projects',
                icon: FolderKanban
            },
            {
                title: 'Analytics',
                url: '/supplier/analytics',
                icon: LineChart
            },
            {
                title: 'Reports',
                url: '/supplier/reports',
                icon: FileText
            },
            {
                title: 'Verification',
                url: '/supplier/verification',
                icon: CheckCircle2
            }
        ]
    }, [role])

    const userData = {
        name: user?.fullName || 'User',
        email: user?.primaryEmailAddress?.emailAddress || '',
        avatar: user?.imageUrl || ''
    }

    return (
        <Sidebar variant="inset" className="top-16 h-[calc(100svh-4rem)]!" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Command className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">Ledgera</span>
                                    <span className="truncate text-xs">Carbon Marketplace</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>{user && <NavUser user={userData} />}</SidebarFooter>
        </Sidebar>
    )
}
