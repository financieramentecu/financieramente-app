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

import { LayoutDashboard, List, ChartBar, Folder, Users, Camera, FileText, FileCode, Settings, Search, Database, FileSpreadsheet, FileText as FileWord, HelpCircleIcon, User } from "lucide-react"
import Image from "next/image"
import { useSidebar } from "@/components/ui/sidebar"


const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      title: "Lifecycle",
      url: "#",
      icon: <List className="h-4 w-4" />,
    },
    {
      title: "Analytics",
      url: "#",
      icon: <ChartBar className="h-4 w-4" />,
    },
    {
      title: "Projects",
      url: "#",
      icon: <Folder className="h-4 w-4" />,
    },
    {
      title: "Team",
      url: "#",
      icon: <Users className="h-4 w-4" />,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: Camera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: FileText,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: FileCode,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
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
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: Database,
    },
    {
      name: "Reports",
      url: "#",
      icon: FileSpreadsheet,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: FileWord,
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
          {data.navSecondary.map((item) => (
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
