'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { Button } from '@/features/shared/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { Switch } from '@/features/shared/ui/switch'
import { Textarea } from '@/features/shared/ui/textarea'
import { useRoleActions } from '../hooks/use-role-actions'
import { useRoleDetail } from '../hooks/use-role-detail'
import {
	findDependencyWarnings,
	groupCatalogByModule,
	grantsEqual,
	setMinLevel,
	setScope,
	toggleGrant,
} from '../lib/permission-matrix'
import { DATA_SCOPES, type DataScopeCode, type RoleGrants } from '../types/access-control.types'
import type { RoleDetail } from '../types/role.types'

const SCOPE_LABELS: Record<DataScopeCode, string> = {
	OWN: 'Solo lo propio',
	TEAM: 'Su equipo',
	COMPANY: 'Toda la compañía',
}
const NO_MIN_LEVEL = '__none__'
const LOCKED_CODES = ['ADMIN', 'SIN_ROL']

interface RoleEditorProps {
	roleId: number
}

export function RoleEditor({ roleId }: RoleEditorProps) {
	const state = useRoleDetail(roleId)

	return (
		<div className="space-y-4 md:space-y-6">
			<Button asChild variant="ghost" size="sm" className="gap-2">
				<Link href="/dashboard/admin/roles">
					<ArrowLeft className="h-4 w-4" />
					Roles
				</Link>
			</Button>
			{state.status === 'loading' && (
				<p className="text-sm text-muted-foreground">Cargando rol...</p>
			)}
			{state.status === 'error' && (
				<Alert variant="destructive">
					<AlertDescription>{state.error}</AlertDescription>
				</Alert>
			)}
			{state.status === 'success' && <RoleEditorForm detail={state.data} />}
		</div>
	)
}

function RoleEditorForm({ detail }: { detail: RoleDetail }) {
	const { role, catalog, levels } = detail
	const locked = LOCKED_CODES.includes(role.code)
	const { update, savePermissions, pending } = useRoleActions()
	const [saved, setSaved] = useState<RoleGrants>(detail.grants)
	const [grants, setGrants] = useState<RoleGrants>(detail.grants)
	const [name, setName] = useState(role.name)
	const [description, setDescription] = useState(role.description ?? '')

	const dirty = !grantsEqual(grants, saved)
	const detailsDirty = name !== role.name || description !== (role.description ?? '')
	const warnings = findDependencyWarnings(grants)
	const nameByCode = new Map(catalog.map((p) => [p.code, p.name]))

	async function handleSave() {
		if (detailsDirty && role.code !== 'ADMIN') {
			const outcome = await update(role.id, { name, description })
			if (!outcome.ok) return void toast.error(outcome.error)
		}
		if (dirty) {
			const outcome = await savePermissions(role.id, grants)
			if (!outcome.ok) return void toast.error(outcome.error)
			setSaved(grants)
		}
		toast.success('Cambios guardados')
	}

	return (
		<>
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">{role.name}</h1>
					<p className="text-sm text-muted-foreground">
						{role.userCount} usuario(s) activo(s) · {role.code}
					</p>
				</div>
				{!locked && (
					<Button onClick={handleSave} disabled={pending || (!dirty && !detailsDirty)}>
						Guardar cambios
					</Button>
				)}
			</div>

			{locked && (
				<Alert>
					<Lock className="h-4 w-4" />
					<AlertDescription>
						{role.code === 'ADMIN'
							? 'El rol Administrador tiene todos los permisos con alcance de toda la compañía y no se puede modificar.'
							: 'Este rol no tiene permisos y no se puede modificar.'}
					</AlertDescription>
				</Alert>
			)}

			{warnings.length > 0 && (
				<Alert>
					<TriangleAlert className="h-4 w-4" />
					<AlertDescription>
						{warnings.map((w) => (
							<p key={w.code}>
								“{nameByCode.get(w.code)}” está activo sin “{nameByCode.get(w.requires)}”. El
								rol podrá actuar sobre registros que no puede ver.
							</p>
						))}
					</AlertDescription>
				</Alert>
			)}

			{!locked && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Datos del rol</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="role-name">Nombre</Label>
							<Input id="role-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="role-description">Descripción</Label>
							<Textarea id="role-description" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
						</div>
					</CardContent>
				</Card>
			)}

			{groupCatalogByModule(catalog).map((group) => (
				<Card key={group.module}>
					<CardHeader>
						<CardTitle className="text-lg">{group.module}</CardTitle>
					</CardHeader>
					<CardContent className="divide-y">
						{group.permissions.map((permission) => {
							const grant = grants[permission.code]
							const enabled = locked ? role.code === 'ADMIN' : grant !== undefined
							return (
								<div key={permission.code} className="flex flex-wrap items-center justify-between gap-3 py-3">
									<Label htmlFor={permission.code} className="flex-1 min-w-48">
										{permission.name}
									</Label>
									<div className="flex items-center gap-3">
										{enabled && permission.supportsScope && (
											<Select
												value={role.code === 'ADMIN' ? 'COMPANY' : (grant?.scope ?? 'OWN')}
												disabled={locked}
												onValueChange={(v) =>
													setGrants((g) => setScope(g, permission.code, v as DataScopeCode))
												}
											>
												<SelectTrigger className="w-44" aria-label={`Alcance de ${permission.name}`}>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{DATA_SCOPES.map((scope) => (
														<SelectItem key={scope} value={scope}>
															{SCOPE_LABELS[scope]}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
										{enabled && permission.supportsMinLevel && !locked && (
											<Select
												value={grant?.minLevelCode ?? NO_MIN_LEVEL}
												onValueChange={(v) =>
													setGrants((g) =>
														setMinLevel(g, permission.code, v === NO_MIN_LEVEL ? undefined : v)
													)
												}
											>
												<SelectTrigger className="w-44" aria-label={`Nivel mínimo de ${permission.name}`}>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value={NO_MIN_LEVEL}>Sin nivel mínimo</SelectItem>
													{levels.map((level) => (
														<SelectItem key={level.code} value={level.code}>
															Desde {level.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
										<Switch
											id={permission.code}
											checked={enabled}
											disabled={locked}
											onCheckedChange={(on) =>
												setGrants((g) => toggleGrant(g, permission, on))
											}
										/>
									</div>
								</div>
							)
						})}
					</CardContent>
				</Card>
			))}
		</>
	)
}
