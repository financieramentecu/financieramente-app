import React from "react"
import { UserRole } from "@/lib/auth/roles"
import { 
  LayoutDashboard, 
  Folder, 
  List, 
  Plus, 
  Upload, 
  History, 
  FileText, 
  BarChart3, 
  Settings,
  X
} from "lucide-react"

/**
 * Estructura de un item de menú
 */
export interface MenuItem {
  title: string
  url: string
  icon: React.ReactNode
  subItems?: MenuItem[]
}

/**
 * Definición completa de todos los items de menú disponibles
 */
export const ALL_MENU_ITEMS: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: "Negocios",
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
      {
        title: "Cancelar Negocio",
        url: "/dashboard/negocios/cancelar",
        icon: <X className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Cargas",
    url: "/dashboard/cargas",
    icon: <Upload className="h-4 w-4" />,
    subItems: [
      {
        title: "Carga Masiva",
        url: "/dashboard/cargas/masiva",
        icon: <Upload className="h-4 w-4" />,
      },
      {
        title: "Historial",
        url: "/dashboard/cargas/historial",
        icon: <History className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Liquidaciones",
    url: "/dashboard/liquidaciones",
    icon: <FileText className="h-4 w-4" />,
    subItems: [
      {
        title: "Preliquidación",
        url: "/dashboard/liquidaciones/preliquidacion",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        title: "Liquidación",
        url: "/dashboard/liquidaciones/liquidacion",
        icon: <FileText className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Reportes",
    url: "/dashboard/reportes",
    icon: <BarChart3 className="h-4 w-4" />,
    subItems: [
      {
        title: "Todos los Reportes",
        url: "/dashboard/reportes",
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        title: "Reportes de Negocio",
        url: "/dashboard/reportes/negocio",
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        title: "Mis Reportes",
        url: "/dashboard/reportes/personales",
        icon: <BarChart3 className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Configuración",
    url: "/dashboard/configuracion",
    icon: <Settings className="h-4 w-4" />,
  },
]

/**
 * Items de menú específicos para Agente
 */
export const AGENTE_MENU_ITEMS: MenuItem[] = [
  {
    title: "Mi Dashboard",
    url: "/dashboard/agente",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: "Mis Negocios",
    url: "/dashboard/negocios",
    icon: <Folder className="h-4 w-4" />,
    subItems: [
      {
        title: "Ver Mis Negocios",
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
    title: "Mis Reportes",
    url: "/dashboard/reportes/personales",
    icon: <BarChart3 className="h-4 w-4" />,
  },
]



