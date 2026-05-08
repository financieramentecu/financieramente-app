'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Eye } from 'lucide-react'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { DataTableColumnHeader } from '@/features/shared/ui/DataTable/DataTableColumnHeader'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import type { User } from '../types/user.types'
import type { ColumnDef } from '@tanstack/react-table'

interface UsersTableProps {
	users: User[]
	isLoading?: boolean
}

export function UsersTable({ users, isLoading = false }: UsersTableProps) {
	const router = useRouter()

	const columns = useMemo<ColumnDef<User>[]>(
		() => [
			{
				id: 'name',
				header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre Completo" />,
				accessorFn: (row) => `${row.name} ${row.lastName}`,
				cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
			},
			{
				accessorKey: 'email',
				header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
				cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
			},
			{
				accessorKey: 'role.name',
				id: 'role',
				header: ({ column }) => <DataTableColumnHeader column={column} title="Rol" />,
				cell: ({ row }) =>
					row.original.role ? (
						<Badge variant="outline" className="capitalize">
							{row.original.role.name}
						</Badge>
					) : (
						<span className="text-sm text-muted-foreground">Sin rol</span>
					),
			},
			{
				accessorKey: 'category.name',
				id: 'category',
				header: ({ column }) => <DataTableColumnHeader column={column} title="Categoría" />,
				cell: ({ row }) => (
					row.original.category ? (
						<div className="flex items-center gap-2">
							<div 
								className="w-2 h-2 rounded-full" 
								style={{ backgroundColor: row.original.category.color || '#e2e8f0' }}
							/>
							<span className="text-sm font-medium">{row.original.category.name}</span>
						</div>
					) : (
						<span className="text-xs text-muted-foreground italic">Sin categoría</span>
					)
				),
			},
			{
				accessorKey: 'leader.name',
				id: 'leader',
				header: ({ column }) => <DataTableColumnHeader column={column} title="Líder" />,
				cell: ({ row }) => (
					row.original.leader ? (
						<div className="flex flex-col leading-tight">
							<span className="text-sm font-medium">
								{row.original.leader.name} {row.original.leader.lastName}
							</span>
							<span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
								{row.original.leader.email}
							</span>
						</div>
					) : (
						<span className="text-xs text-muted-foreground italic">Sin líder</span>
					)
				),
			},
			{
				accessorKey: 'active',
				header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
				cell: ({ row }) => (
					<Badge variant={row.original.active ? 'default' : 'secondary'}>
						{row.original.active ? 'Activo' : 'Inactivo'}
					</Badge>
				),
			},
			{
				accessorKey: 'createdAt',
				header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Creación" />,
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{format(new Date(row.original.createdAt), 'PP', { locale: es })}
					</span>
				),
			},
			{
				accessorKey: 'lastLogin',
				header: ({ column }) => <DataTableColumnHeader column={column} title="Último Acceso" />,
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.lastLogin
							? format(new Date(row.original.lastLogin), 'PPp', { locale: es })
							: 'Nunca'}
					</span>
				),
			},
		],
		[]
	)

	return (
		<DataTable
			columns={columns}
			data={users}
			loading={isLoading}
			searchable={true}
			searchColumn="name"
			searchPlaceholder="Buscar por nombre o email..."
			emptyMessage="No se encontraron usuarios"
			actions={(user) => (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
					className="gap-2 h-8"
				>
					<Eye className="h-4 w-4" />
					Ver detalle
				</Button>
			)}
		/>
	)
}

