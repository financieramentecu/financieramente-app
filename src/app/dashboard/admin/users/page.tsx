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
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
						<p className="text-muted-foreground mt-2">
							Administra los usuarios del sistema, sus roles y permisos
						</p>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Filtros de Búsqueda</CardTitle>
						<CardDescription>
							Filtra y busca usuarios por nombre, email, estado o rol
						</CardDescription>
					</CardHeader>
					<CardContent>
						<UsersFilters
							filters={filters}
							onFiltersChange={setFilters}
							roles={roles}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Usuarios del Sistema</CardTitle>
						<CardDescription>
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
