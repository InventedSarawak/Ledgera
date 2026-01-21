'use client'

import * as React from 'react'
import { LayoutDashboard, FolderKanban, LineChart, Settings, Command } from 'lucide-react'

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel
} from '@/components/ui/sidebar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
    {
        title: 'Overview',
        url: '/',
        icon: LayoutDashboard
    },
    {
        title: 'Projects',
        url: '/projects',
        icon: FolderKanban
    },
    {
        title: 'Analytics',
        url: '/analytics',
        icon: LineChart
    },
    {
        title: 'Settings',
        url: '/settings',
        icon: Settings
    }
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()

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
        </Sidebar>
    )
}
