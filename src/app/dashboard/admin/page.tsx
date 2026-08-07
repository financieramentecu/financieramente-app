'use client'

import React from 'react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { AdminCard } from '@/features/admin/shared/AdminCard'
import {
	Building2,
	Package,
	DollarSign,
	Calendar,
	ArrowRightLeft,
	Users,
	Tag,
	Percent,
	ShieldCheck,
} from 'lucide-react'

export default function AdminDashboardPage() {
	const adminModules = [
		{
			title: 'Compañías',
			description: 'Gestionar compañías aseguradoras',
			href: '/dashboard/admin/companies',
			icon: <Building2 className="h-5 w-5 text-primary" />,
		},
		{
			title: 'Productos',
			description: 'Gestionar productos de seguros',
			href: '/dashboard/admin/products',
			icon: <Package className="h-5 w-5 text-primary" />,
		},
		{
			title: 'Monedas',
			description: 'Gestionar monedas del sistema',
			href: '/dashboard/admin/currencies',
			icon: <DollarSign className="h-5 w-5 text-primary" />,
		},
		{
			title: 'Periodicidades',
			description: 'Gestionar periodicidades de pago',
			href: '/dashboard/admin/periodicities',
			icon: <Calendar className="h-5 w-5 text-primary" />,
		},
		{
			title: 'Orígenes',
			description: 'Gestionar orígenes de productos y clientes',
			href: '/dashboard/admin/origins',
			icon: <ArrowRightLeft className="h-5 w-5 text-primary" />,
		},
		{
			title: 'Categorías',
			description: 'Gestionar categorías de usuarios',
			href: '/dashboard/admin/categories',
			icon: <Tag className="h-5 w-5 text-primary" />,
		},
		{
			title: 'Usuarios',
			description: 'Gestionar usuarios y agentes',
			href: '/dashboard/admin/users',
			icon: <Users className="h-5 w-5 text-primary" />,
		},
		{
			title: 'Descuentos',
			description: 'Gestionar descuentos de impuesto y clawback',
			href: '/dashboard/admin/discounts',
			icon: <Percent className="h-5 w-5 text-primary" />,
		},
		{
			title: 'Permisos de Reportes',
			description: 'Configurar qué categorías pueden ver cada reporte',
			href: '/dashboard/admin/report-permissions',
			icon: <ShieldCheck className="h-5 w-5 text-primary" />,
		},
	]

	return (
		<DashboardLayout currentPage="Administración">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">Panel de Administración</h1>
					<p className="text-muted-foreground mt-2">
						Gestiona los catálogos base del sistema
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{adminModules.map((module) => (
						<AdminCard
							key={module.href}
							title={module.title}
							description={module.description}
							href={module.href}
							icon={module.icon}
						/>
					))}
				</div>
			</div>
		</DashboardLayout>
	)
}
