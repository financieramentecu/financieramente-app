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

import { LayoutDashboard, List, ChartBar, Folder, Users, Camera, FileText, FileCode, Settings, Search, Database, FileSpreadsheet, FileText as FileWord, HelpCircleIcon } from "lucide-react"
import Image from "next/image"


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
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HelpCircleIcon ,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5! sidebar-button"
            >
              <a href="#">
                <Image 
                  src="/logos/logo-verde.svg" 
                  alt="Financieramente" 
                  width={24} 
                  height={24}
                  className="size-6"
                />
                <span className="text-base font-semibold">Financieramente</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        footer
      </SidebarFooter>
    </Sidebar>
  )
}
