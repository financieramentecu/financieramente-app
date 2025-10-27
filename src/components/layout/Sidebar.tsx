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
  useSidebar,
  SidebarMenuItem,
} from "../ui/sidebar"

import { Building2, ChevronDown, Settings, User } from "lucide-react"
import Image from "next/image"


const data = {
  user: {
    name: "Juan A",
    email: "juan@example.com",
    avatar: "/avatars/juan.jpg",
  },
  navMain: [
    {
      title: "Negocio",
      url: "#",
      icon: <Building2 className="h-4 w-4" />,
      isActive: true,
    },
    {
      title: "Distribución",
      url: "#",
      icon: <ChevronDown className="h-4 w-4" />,
      hasDropdown: true,
    },
    {
      title: "Pre-liquidación",
      url: "#",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      title: "Liquidación",
      url: "#",
      icon: <Building2 className="h-4 w-4" />,
    },
  ],
  navSecondary: [
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
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  
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
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={data.user.name} asChild className="sidebar-button">
              <a href="#">
                <User className="h-4 w-4" />
                <span>{data.user.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
