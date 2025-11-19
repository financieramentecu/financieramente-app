"use client"

import * as React from "react"
import { NavMain } from "../layout/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Settings, User } from "lucide-react"
import Image from "next/image"
import { useSidebar } from "@/components/ui/sidebar"
import { useAuthSession } from "@/hooks/use-auth-session"
import { buildMenuByRole } from "@/lib/navigation/menu-builder"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar()
  const { session } = useAuthSession()
  const isCollapsed = state === "collapsed"

  // Construir menú dinámico según rol y permisos
  const menuItems = React.useMemo(() => {
    if (!session?.user) {
      return []
    }
    return buildMenuByRole(session.user.role, session.user.permissions)
  }, [session])

  const navSecondary = [
    {
      title: "Perfil",
      url: "#",
      icon: <User className="h-4 w-4" />,
    },
    {
      title: "Configuración",
      url: "#",
      icon: <Settings className="h-4 w-4" />,
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-0! sidebar-button w-full h-24"
            >
              <a href="#" className="w-full h-full flex items-center justify-center">
                <Image 
                  src={isCollapsed ? "/logos/isologo-verde.svg" : "/logos/logo-verde.svg"} 
                  alt="Financieramente" 
                  width={isCollapsed ? 60 : 150}
                  height={isCollapsed ? 60 : 80}
                  className={isCollapsed ? "size-16" : "w-full h-auto max-h-20 object-contain"}
                />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={menuItems} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {navSecondary.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} asChild className="sidebar-button">
                <a href={item.url}>
                  {item.icon}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
