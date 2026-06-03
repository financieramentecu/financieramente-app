'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Eye, LogIn } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { useFeatureFlag } from '@/features/shared/hooks/use-feature-flag'
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
	const { update } = useSession()
	const { enabled: impersonationEnabled } = useFeatureFlag('impersonation_select')

	const handleImpersonate = async (targetUserId: number) => {
		try {
			await update({ impersonateUserId: targetUserId.toString() })
			toast.success('Iniciando sesión como usuario...')
			window.location.href = '/dashboard' // Recargar toda la app
		} catch (error) {
			toast.error('Error al iniciar sesión como usuario')
			console.error(error)
		}
	}

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
						<Badge variant="outline" className="capitalize whitespace-nowrap">
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
						<span className="text-sm font-medium">{row.original.category.name}</span>
					) : (
						<span className="text-xs text-muted-foreground italic">Sin categoría</span>
					)
				),
			},
			{
				accessorKey: 'level.name',
				id: 'level',
				header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel (Jerarquía)" />,
				cell: ({ row }) => {
					const level = row.original.level
					if (!level) return <span className="text-xs text-muted-foreground italic">Sin nivel</span>
					const color = level.color || '#94a3b8'
					return (
						<span
							className="inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-0.5 rounded-full border whitespace-nowrap"
							style={{ color, borderColor: color, backgroundColor: `${color}18` }}
						>
							<span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
							{level.name}
						</span>
					)
				},
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
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
						className="gap-2 h-8"
					>
						<Eye className="h-4 w-4" />
						Ver detalle
					</Button>
					{impersonationEnabled && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => handleImpersonate(user.id)}
							className="gap-2 h-8 border-orange-200 hover:bg-orange-50 hover:text-orange-700 text-orange-600"
						>
							<LogIn className="h-4 w-4" />
							Ver como
						</Button>
					)}
				</div>
			)}
		/>
	)
}

