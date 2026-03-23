'use client'

import React, { useState } from 'react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import { UsersTable } from '@/features/admin/users/components/users-table'
import { UsersFilters } from '@/features/admin/users/components/users-filters'
import { useUsers } from '@/features/admin/users/hooks/use-users'
import { useRoles } from '@/features/admin/users/hooks/use-roles'
import type { UserFilters } from '@/features/admin/users/types/user.types'

export default function AdminUsersPage() {
	const [filters, setFilters] = useState<UserFilters>({})
	const { users, isLoading } = useUsers(filters)
	const { roles } = useRoles()

	return (
		<DashboardLayout currentPage="Usuarios">
			<div className="space-y-4 md:space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl md:text-3xl font-bold">Gestión de Usuarios</h1>
						<p className="text-muted-foreground mt-1 text-sm md:text-base hidden sm:block">
							Administra los usuarios del sistema, sus roles y permisos
						</p>
					</div>
				</div>

				<Card className="shadow-none sm:shadow-sm">
					<CardHeader className="hidden md:flex">
						<CardTitle>Filtros de Búsqueda</CardTitle>
						<CardDescription>
							Filtra y busca usuarios por nombre, email, estado o rol
						</CardDescription>
					</CardHeader>
					<CardContent className="pt-6 md:pt-0">
						<UsersFilters
							filters={filters}
							onFiltersChange={setFilters}
							roles={roles}
						/>
					</CardContent>
				</Card>

				<Card className="shadow-none sm:shadow-sm">
					<CardHeader className="pb-3 md:pb-6">
						<CardTitle className="text-xl md:text-2xl">Usuarios del Sistema</CardTitle>
						<CardDescription className="hidden sm:block">
							Haz clic en &quot;Ver detalle&quot; para gestionar cada usuario
						</CardDescription>
					</CardHeader>
					<CardContent>
						<UsersTable users={users} isLoading={isLoading} />
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	)
}
