"use client"

import React from 'react'
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from '../components/layout/Sidebar'
import { SiteHeader } from '../components/layout/Header'
import { NavItem } from '../types/user'
import { User } from '../types/user'

interface DashboardLayoutNewProps {
  children: React.ReactNode
  currentPage?: string
  user?: User
  navItems?: NavItem[]
  onNavItemClick?: (href: string) => void
  onUserAction?: (action: string) => void
}

export function DashboardLayout({ 
  children,
  currentPage = "Dashboard",
}: DashboardLayoutNewProps) {
  return (
    <SidebarProvider defaultOpen={true}>
     <AppSidebar />
      <SidebarInset>
        <SiteHeader title={currentPage} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
