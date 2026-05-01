import React from 'react'
import {
	LayoutDashboard,
	Folder,
	List,
	Plus,
	FileText,
	BarChart3,
	Settings,
	Users,
	FileUp,
	Building2,
	Package,
	UserCircle,
	Tag,
	Sliders,
	Percent,
	PieChart,
	Receipt,
} from 'lucide-react'

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
		title: 'Dashboard',
		url: '/dashboard',
		icon: <LayoutDashboard className="h-4 w-4" />,
	},
	{
		title: 'Negocios',
		url: '/dashboard/negocios',
		icon: <Folder className="h-4 w-4" />,
	},
	{
		title: 'Carga Archivos',
		url: '/dashboard/carga-archivos',
		icon: <FileUp className="h-4 w-4" />,
	},

	{
		title: 'Liquidaciones',
		url: '/dashboard/liquidaciones',
		icon: <FileText className="h-4 w-4" />,
		subItems: [
			{
				title: 'Preliquidación',
				url: '/dashboard/pre-liquidacion',
				icon: <FileText className="h-4 w-4" />,
			},
			{
				title: 'Liquidación',
				url: '/dashboard/liquidaciones',
				icon: <FileText className="h-4 w-4" />,
			},
		],
	},
	{
		title: 'Mis distribuciones',
		url: '/dashboard/mis-distribuciones',
		icon: <Receipt className="h-4 w-4" />,
	},
	{
		title: 'Reportes',
		url: '/dashboard/reportes',
		icon: <BarChart3 className="h-4 w-4" />,
		subItems: [
			{
				title: 'Todos los Reportes',
				url: '/dashboard/reportes',
				icon: <BarChart3 className="h-4 w-4" />,
			},
			{
				title: 'Reportes de Negocio',
				url: '/dashboard/reportes/negocio',
				icon: <BarChart3 className="h-4 w-4" />,
			},
			{
				title: 'Mis Reportes',
				url: '/dashboard/reportes/personales',
				icon: <BarChart3 className="h-4 w-4" />,
			},
		],
	},
	{
		title: 'Usuarios',
		url: '/dashboard/admin/users',
		icon: <Users className="h-4 w-4" />,
	},
	{
		title: 'Administración',
		url: '/dashboard/admin/companies',
		icon: <Settings className="h-4 w-4" />,
		subItems: [
			{
				title: 'Compañias',
				url: '/dashboard/admin/companies',
				icon: <Building2 className="h-4 w-4" />,
			},
			{
				title: 'Productos',
				url: '/dashboard/products',
				icon: <Package className="h-4 w-4" />,
			},
			{
				title: 'Categorías',
				url: '/dashboard/categorias',
				icon: <Tag className="h-4 w-4" />,
			},
			{
				title: 'Tipo Categoría',
				url: '/dashboard/admin/category-types',
				icon: <Tag className="h-4 w-4" />,
			},
			{
				title: 'Origen Cliente',
				url: '/dashboard/origenes',
				icon: <UserCircle className="h-4 w-4" />,
			},
			{
				title: 'Config. Producto',
				url: '/dashboard/configuraciones-producto',
				icon: <Sliders className="h-4 w-4" />,
			},
			{
				title: 'Config. distribución de comisiones',
				url: '/dashboard/config-distribucion-comisiones',
				icon: <PieChart className="h-4 w-4" />,
			},
			{
				title: 'Descuentos',
				url: '/dashboard/admin/discounts',
				icon: <Percent className="h-4 w-4" />,
			},
		],
	},
]

/**
 * Items de menú específicos para Agente
 */
export const AGENTE_MENU_ITEMS: MenuItem[] = [
	{
		title: 'Mis Negocios',
		url: '/dashboard/negocios',
		icon: <Folder className="h-4 w-4" />,
		subItems: [
			{
				title: 'Ver Mis Negocios',
				url: '/dashboard/negocios',
				icon: <List className="h-4 w-4" />,
			},
			{
				title: 'Crear Negocio',
				url: '/dashboard/negocios/crear',
				icon: <Plus className="h-4 w-4" />,
			},
		],
	},
	/* 	{
			title: 'Mis Reportes',
			url: '/dashboard/reportes/personales',
			icon: <BarChart3 className="h-4 w-4" />,
		}, */
]
