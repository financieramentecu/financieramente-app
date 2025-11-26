'use client'

import React from 'react'

import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'

export default function AdminUsersPage() {
	return (
		<DashboardLayout currentPage="Usuarios">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
						<p className="text-muted-foreground mt-2">
							Próximamente podrás administrar agentes, jerarquías y accesos del
							sistema desde este panel.
						</p>
					</div>
					<Button disabled className="opacity-60 cursor-not-allowed">
						Crear Usuario
					</Button>
				</div>

				<Card className="border-dashed">
					<CardHeader>
						<CardTitle>Sección en construcción</CardTitle>
						<CardDescription>
							Estamos preparando el módulo completo de usuarios (listado,
							filtros, asignación de roles, etc.).
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Mientras tanto, puedes seguir gestionando catálogos como
							compañías, productos o categorías desde los módulos existentes.
						</p>
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	)
}
