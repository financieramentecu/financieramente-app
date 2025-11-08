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
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Header fijo */}
        <div className="sticky top-0 z-50 bg-background">
          <SiteHeader title={currentPage} />
        </div>
        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 p-4 pt-4">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
