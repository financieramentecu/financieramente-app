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

import { Folder, Settings, User, List, Plus, Shield } from "lucide-react"
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
      title: "Negocio",
      url: "/dashboard/negocios",
      icon: <Folder className="h-4 w-4" />,
      subItems: [
        {
          title: "Listar Negocios",
          url: "/dashboard/negocios",
          icon: <List className="h-4 w-4" />,
        },
        {
          title: "Crear Negocio",
          url: "/dashboard/negocios/crear",
          icon: <Plus className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Administración",
      url: "/dashboard/admin",
      icon: <Shield className="h-4 w-4" />,
      subItems: [
        {
          title: "Compañías",
          url: "/dashboard/admin/companies",
          icon: <List className="h-4 w-4" />,
        },
        {
          title: "Productos",
          url: "/dashboard/admin/products",
          icon: <List className="h-4 w-4" />,
        },
        {
          title: "Monedas",
          url: "/dashboard/admin/currencies",
          icon: <List className="h-4 w-4" />,
        },
        {
          title: "Periodicidades",
          url: "/dashboard/admin/periodicities",
          icon: <List className="h-4 w-4" />,
        },
        {
          title: "Orígenes",
          url: "/dashboard/admin/origins",
          icon: <List className="h-4 w-4" />,
        },
        {
          title: "Categorías",
          url: "/dashboard/admin/categories",
          icon: <List className="h-4 w-4" />,
        },
        {
          title: "Usuarios",
          url: "/dashboard/admin/users",
          icon: <List className="h-4 w-4" />,
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
