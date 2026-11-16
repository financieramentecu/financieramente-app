'use client'

import {
	CardGridSkeleton,
	SkeletonRegion,
} from '@/features/shared/ui/loading-skeletons'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Search, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { Button } from '@/features/shared/ui/button'
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
import { cn } from '@/lib/utils'
import { usePermissions } from '@/features/shared/hooks/use-permissions'
import { useRoleActions } from '../hooks/use-role-actions'
import { useRoleDetail } from '../hooks/use-role-detail'
import {
	filterModuleGroups,
	findDependencyWarnings,
	groupCatalogByModule,
	grantsEqual,
	setMinLevel,
	setModuleGrants,
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
const COMPACT_SELECT = 'h-7 w-[8.5rem] px-2 text-xs'

interface RoleEditorProps {
	roleId: number
}

function RoleEditorSkeleton() {
	return (
		<SkeletonRegion label="Cargando rol" className="space-y-3">
			<div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
				<div className="space-y-2">
					<Skeleton className="h-5 w-48" />
					<Skeleton className="h-3 w-64" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-8 w-24 rounded-md" />
					<Skeleton className="h-8 w-32 rounded-md" />
				</div>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<Skeleton className="h-9 w-full rounded-md" />
				<Skeleton className="h-9 w-full rounded-md" />
			</div>
			<CardGridSkeleton label="Cargando permisos" cards={6} />
		</SkeletonRegion>
	)
}

export function RoleEditor({ roleId }: RoleEditorProps) {
	const state = useRoleDetail(roleId)

	return (
		<div className="space-y-3">
			{state.status === 'loading' && <RoleEditorSkeleton />}
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
	const { can } = usePermissions()
	// Locked roles are never editable; otherwise saving needs roles.gestionar.
	const readOnly = locked || !can('roles.gestionar')
	const { update, savePermissions, pending } = useRoleActions()
	const [saved, setSaved] = useState<RoleGrants>(detail.grants)
	const [grants, setGrants] = useState<RoleGrants>(detail.grants)
	const [name, setName] = useState(role.name)
	const [description, setDescription] = useState(role.description ?? '')
	const [savedDetails, setSavedDetails] = useState({
		name: role.name,
		description: role.description ?? '',
	})
	const [query, setQuery] = useState('')
	const [onlyGranted, setOnlyGranted] = useState(false)

	const dirty = !grantsEqual(grants, saved)
	const detailsDirty =
		name !== savedDetails.name || description !== savedDetails.description
	const hasChanges = dirty || detailsDirty
	const warnings = findDependencyWarnings(grants)
	const nameByCode = new Map(catalog.map((p) => [p.code, p.name]))
	const groups = groupCatalogByModule(catalog)
	const visibleGroups = filterModuleGroups(groups, query, grants, onlyGranted)
	const grantedCount = locked
		? role.code === 'ADMIN'
			? catalog.length
			: 0
		: Object.keys(grants).length

	async function handleSave() {
		if (detailsDirty && role.code !== 'ADMIN') {
			const outcome = await update(role.id, { name, description })
			if (!outcome.ok) return void toast.error(outcome.error)
			setSavedDetails({ name, description })
		}
		if (dirty) {
			const outcome = await savePermissions(role.id, grants)
			if (!outcome.ok) return void toast.error(outcome.error)
			setSaved(grants)
		}
		toast.success('Cambios guardados')
	}

	function handleDiscard() {
		setGrants(saved)
		setName(savedDetails.name)
		setDescription(savedDetails.description)
	}

	return (
		<>
			<div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
				<Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Volver a Roles">
					<Link href="/dashboard/admin/roles">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div className="min-w-0 flex-1">
					<h1 className="truncate text-lg font-semibold leading-tight md:text-xl">{role.name}</h1>
					<p className="truncate text-xs text-muted-foreground">
						{role.code} · {role.userCount} usuario(s) activo(s) · {grantedCount} de {catalog.length} permisos
					</p>
				</div>
				{!readOnly && (
					<div className="flex items-center gap-2">
						{hasChanges && (
							<span className="hidden text-xs text-amber-600 sm:inline" role="status">
								Cambios sin guardar
							</span>
						)}
						<Button variant="ghost" size="sm" onClick={handleDiscard} disabled={pending || !hasChanges}>
							Descartar
						</Button>
						<Button size="sm" onClick={handleSave} disabled={pending || !hasChanges}>
							Guardar cambios
						</Button>
					</div>
				)}
			</div>

			{locked && (
				<Alert className="py-2">
					<Lock className="h-4 w-4" />
					<AlertDescription className="text-sm">
						{role.code === 'ADMIN'
							? 'El rol Administrador tiene todos los permisos con alcance de toda la compañía y no se puede modificar.'
							: 'Este rol no tiene permisos y no se puede modificar.'}
					</AlertDescription>
				</Alert>
			)}

			{!locked && readOnly && (
				<Alert className="py-2">
					<Lock className="h-4 w-4" />
					<AlertDescription className="text-sm">
						Solo lectura: tu rol puede ver los roles pero no puede modificarlos.
					</AlertDescription>
				</Alert>
			)}

			{warnings.length > 0 && (
				<Alert className="py-2">
					<TriangleAlert className="h-4 w-4" />
					<AlertDescription className="text-sm">
						{warnings.map((w) => (
							<p key={w.code}>
								“{nameByCode.get(w.code)}” está activo sin “{nameByCode.get(w.requires)}”. El rol podrá actuar
								sobre registros que no puede ver.
							</p>
						))}
					</AlertDescription>
				</Alert>
			)}

			{!readOnly && (
				<div className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2">
					<div className="space-y-1">
						<Label htmlFor="role-name" className="text-xs">Nombre</Label>
						<Input id="role-name" className="h-8" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
					</div>
					<div className="space-y-1">
						<Label htmlFor="role-description" className="text-xs">Descripción</Label>
						<Input id="role-description" className="h-8" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
					</div>
				</div>
			)}

			<div className="flex flex-wrap items-center gap-3">
				<div className="relative min-w-48 flex-1 sm:max-w-xs">
					<Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" aria-hidden />
					<Input
						className="h-8 pl-8"
						placeholder="Buscar permiso..."
						aria-label="Buscar permiso"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
				<div className="flex items-center gap-2">
					<Switch id="only-granted" size="sm" checked={onlyGranted} onCheckedChange={setOnlyGranted} />
					<Label htmlFor="only-granted" className="cursor-pointer text-xs">Solo activos</Label>
				</div>
			</div>

			{visibleGroups.length === 0 && (
				<p className="py-6 text-center text-sm text-muted-foreground">Ningún permiso coincide con la búsqueda.</p>
			)}

			<div className="grid items-start gap-3 xl:grid-cols-2">
				{visibleGroups.map((group) => {
					const modulePermissions = groups.find((g) => g.module === group.module)?.permissions ?? group.permissions
					const moduleOn = modulePermissions.filter((p) =>
						locked ? role.code === 'ADMIN' : p.code in grants
					).length
					const allOn = moduleOn === modulePermissions.length
					return (
						<section key={group.module} className="overflow-hidden rounded-lg border bg-card">
							<header className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
								<h2 className="text-sm font-semibold">
									{group.module}
									<span className="ml-2 text-xs font-normal text-muted-foreground">
										{moduleOn}/{modulePermissions.length}
									</span>
								</h2>
								{!readOnly && (
									<Button
										variant="ghost"
										size="sm"
										className="h-6 px-2 text-xs"
										onClick={() => setGrants((g) => setModuleGrants(g, modulePermissions, !allOn))}
									>
										{allOn ? 'Quitar todos' : 'Activar todos'}
									</Button>
								)}
							</header>
							<div className="divide-y">
								{group.permissions.map((permission) => {
									const grant = grants[permission.code]
									const enabled = locked ? role.code === 'ADMIN' : grant !== undefined
									return (
										<div
											key={permission.code}
											className={cn(
												'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5 transition-colors',
												!readOnly && 'hover:bg-muted/40'
											)}
										>
											<Label
												htmlFor={permission.code}
												className={cn('min-w-[12rem] flex-1 cursor-pointer text-sm font-normal leading-snug', !enabled && 'text-muted-foreground')}
											>
												{permission.name}
											</Label>
											<div className="flex items-center gap-2">
												{enabled && permission.supportsScope && (
													<Select
														value={role.code === 'ADMIN' ? 'COMPANY' : (grant?.scope ?? 'OWN')}
														disabled={readOnly}
														onValueChange={(v) => setGrants((g) => setScope(g, permission.code, v as DataScopeCode))}
													>
														<SelectTrigger className={COMPACT_SELECT} aria-label={`Alcance de ${permission.name}`}>
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
														disabled={readOnly}
														onValueChange={(v) =>
															setGrants((g) => setMinLevel(g, permission.code, v === NO_MIN_LEVEL ? undefined : v))
														}
													>
														<SelectTrigger className={COMPACT_SELECT} aria-label={`Nivel mínimo de ${permission.name}`}>
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
													size="sm"
													checked={enabled}
													disabled={readOnly}
													onCheckedChange={(on) => setGrants((g) => toggleGrant(g, permission, on))}
												/>
											</div>
										</div>
									)
								})}
							</div>
						</section>
					)
				})}
			</div>
		</>
	)
}
