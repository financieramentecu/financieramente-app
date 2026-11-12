'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
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

	const roles = state.status === 'success' ? state.data : []

	return (
		<div className="space-y-4 md:space-y-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Roles y permisos</h1>
					<p className="text-muted-foreground mt-1 text-sm md:text-base hidden sm:block">
						Crea roles y define qué puede hacer cada uno
					</p>
				</div>
				<Button className="gap-2" onClick={() => setCreateOpen(true)}>
					<Plus className="h-4 w-4" />
					Crear rol
				</Button>
			</div>

			{state.status === 'error' && (
				<Alert variant="destructive">
					<AlertDescription>{state.error}</AlertDescription>
				</Alert>
			)}

			<Card className="shadow-none sm:shadow-sm">
				<CardHeader className="pb-3 md:pb-6">
					<CardTitle className="text-xl md:text-2xl">Roles</CardTitle>
					<CardDescription className="hidden sm:block">
						Usuarios activos y permisos habilitados de cada rol
					</CardDescription>
				</CardHeader>
				<CardContent>
					{state.status === 'loading' ? (
						<p className="text-sm text-muted-foreground">Cargando roles...</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Rol</TableHead>
									<TableHead className="text-right">Usuarios</TableHead>
									<TableHead className="text-right">Permisos</TableHead>
									<TableHead className="text-right">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{roles.map((role) => (
									<TableRow key={role.id}>
										<TableCell>
											<div className="flex items-center gap-2 font-medium">
												{role.name}
												{role.isSystem && <Badge variant="secondary">Sistema</Badge>}
											</div>
											{role.description && (
												<p className="text-xs text-muted-foreground">{role.description}</p>
											)}
										</TableCell>
										<TableCell className="text-right">{role.userCount}</TableCell>
										<TableCell className="text-right">{role.permissionCount}</TableCell>
										<TableCell className="text-right space-x-2">
											<Button asChild size="sm" variant="outline">
												<Link href={`/dashboard/admin/roles/${role.id}`}>
													{role.code === 'ADMIN' ? 'Ver' : 'Editar'}
												</Link>
											</Button>
											{!role.isSystem && (
												<Button
													size="sm"
													variant="outline"
													onClick={() => setToDeactivate(role)}
												>
													Desactivar
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

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
