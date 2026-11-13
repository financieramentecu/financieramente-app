'use client'

import { ListRowsSkeleton } from '@/features/shared/ui/loading-skeletons'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { ConfirmActionDialog } from '@/features/shared/ui/confirm-action-dialog'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/features/shared/ui/table'
import { useRoleActions } from '../hooks/use-role-actions'
import { useRoles } from '../hooks/use-roles'
import type { RoleOverview } from '../types/role.types'
import { CreateRoleDialog } from './create-role-dialog'

/** Admin > Roles: list, create and deactivate. */
export function RolesManager() {
	const router = useRouter()
	const { state, refresh } = useRoles()
	const { deactivate } = useRoleActions()
	const [createOpen, setCreateOpen] = useState(false)
	const [toDeactivate, setToDeactivate] = useState<RoleOverview | null>(null)
	const [search, setSearch] = useState('')

	async function handleConfirmDeactivate() {
		const role = toDeactivate
		setToDeactivate(null)
		if (!role) return
		const outcome = await deactivate(role.id)
		if (!outcome.ok) {
			toast.error(outcome.error)
			return
		}
		toast.success('Rol desactivado')
		void refresh()
	}

	const allRoles = state.status === 'success' ? state.data : []
	const needle = search.trim().toLowerCase()
	const roles = needle
		? allRoles.filter(
				(role) =>
					role.name.toLowerCase().includes(needle) ||
					role.code.toLowerCase().includes(needle)
			)
		: allRoles

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="min-w-0">
					<h1 className="text-xl font-semibold leading-tight md:text-2xl">Roles y permisos</h1>
					<p className="text-xs text-muted-foreground sm:text-sm">
						{state.status === 'loading' ? '' : `${allRoles.length} roles · `}
						define qué puede hacer cada uno
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div className="relative">
						<Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" aria-hidden />
						<Input
							className="h-8 w-44 pl-8 sm:w-56"
							placeholder="Buscar rol..."
							aria-label="Buscar rol"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
						<Plus className="h-4 w-4" />
						Crear rol
					</Button>
				</div>
			</div>

			{state.status === 'error' && (
				<Alert variant="destructive">
					<AlertDescription>{state.error}</AlertDescription>
				</Alert>
			)}

			<div className="overflow-hidden rounded-lg border bg-card">
				{state.status === 'loading' ? (
					<ListRowsSkeleton label="Cargando roles" rows={6} />
				) : roles.length === 0 ? (
					<p className="p-6 text-center text-sm text-muted-foreground">
						{needle ? 'Ningún rol coincide con la búsqueda.' : 'Aún no hay roles.'}
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="h-9 px-3">Rol</TableHead>
								<TableHead className="h-9 w-20 px-3 text-right">Usuarios</TableHead>
								<TableHead className="h-9 w-20 px-3 text-right">Permisos</TableHead>
								<TableHead className="h-9 w-44 px-3 text-right">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{roles.map((role) => (
								<TableRow key={role.id}>
									<TableCell className="px-3 py-2">
										<div className="flex items-center gap-2 text-sm font-medium">
											{role.name}
											{role.isSystem && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">Sistema</Badge>}
										</div>
										{role.description && (
											<p className="line-clamp-1 text-xs text-muted-foreground">{role.description}</p>
										)}
									</TableCell>
									<TableCell className="px-3 py-2 text-right text-sm tabular-nums">{role.userCount}</TableCell>
									<TableCell className="px-3 py-2 text-right text-sm tabular-nums">{role.permissionCount}</TableCell>
									<TableCell className="px-3 py-2 text-right">
										<div className="flex items-center justify-end gap-1.5">
											<Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-xs">
												<Link href={`/dashboard/admin/roles/${role.id}`}>
													{role.code === 'ADMIN' || role.code === 'SIN_ROL' ? 'Ver' : 'Editar'}
												</Link>
											</Button>
											{!role.isSystem && (
												<Button
													size="sm"
													variant="ghost"
													className="h-7 px-2.5 text-xs text-destructive hover:text-destructive"
													onClick={() => setToDeactivate(role)}
												>
													Desactivar
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>

			<CreateRoleDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				onCreated={(role) => {
					toast.success('Rol creado')
					router.push(`/dashboard/admin/roles/${role.id}`)
				}}
			/>

			<ConfirmActionDialog
				open={toDeactivate !== null}
				title="Desactivar rol"
				description={`El rol ${toDeactivate?.name ?? ''} dejará de estar disponible. Si tiene usuarios activos, primero deben reasignarse.`}
				confirmLabel="Desactivar"
				onConfirm={handleConfirmDeactivate}
				onCancel={() => setToDeactivate(null)}
			/>
		</div>
	)
}
