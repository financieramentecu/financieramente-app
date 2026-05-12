'use client'

import React, { useState, useEffect } from 'react'
import { Save, Shield, Power, AlertTriangle } from 'lucide-react'
import { SelectLoading } from '@/features/shared/ui/select-loading'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Label } from '@/features/shared/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { Switch } from '@/features/shared/ui/switch'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/features/shared/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/features/shared/ui/alert'
import type { User } from '../types/user.types'
import { useRoles } from '../hooks/use-roles'
import { useUserAccessValidation } from '../hooks/use-user-access-validation'
import { isDefaultRole } from '../utils/user-access.utils'
import { updateUserSchema } from '../lib/user-schemas'
import { useAdminCategories as useCategories } from '@/features/categories/hooks/use-admin-categories'
import { useLevels } from '@/features/levels/hooks/use-levels'
import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { UserWithRole } from '@/features/negocios/types/business.types'
import {
	UI_TEXT,
	WARNING_MESSAGES,
	DIALOG_TITLES,
	DIALOG_DESCRIPTIONS,
} from '../constants/user-management.constants'

interface UserActionsCardProps {
	user: User
	onUpdate: (data: {
		active?: boolean
		roleId?: number | null
		categoryId?: number | null
		levelId?: number | null
		leaderId?: number | null
	}) => Promise<void>
	isLoading?: boolean
}

export function UserActionsCard({
	user,
	onUpdate,
	isLoading = false,
}: UserActionsCardProps) {
	const [active, setActive] = useState(user.active)
	const [selectedRoleId, setSelectedRoleId] = useState<number | null>(
		user.role?.id || null
	)
	const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
		user.category?.id || null
	)
	const [selectedLevelId, setSelectedLevelId] = useState<number | null>(
		user.level?.id || null
	)
	const [selectedLeaderId, setSelectedLeaderId] = useState<string>(
		user.leader?.id ? user.leader.id.toString() : ''
	)
	const [hasChanges, setHasChanges] = useState(false)
	const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
	const [validationError, setValidationError] = useState<string | null>(null)

	const { roles, isLoading: loadingRoles } = useRoles()
	const { categories: allCategories, isLoading: loadingCategories } =
		useCategories({
			status: 'active',
		})
	const { state: levelsState } = useLevels({ status: 'active', pageSize: 100 })
	const levels =
		levelsState.status === 'success' ? (levelsState.data?.levels ?? []) : []
	const loadingLevels = levelsState.status === 'loading'

	const [selectedLeaderLevelId, setSelectedLeaderLevelId] = useState<
		number | null
	>(null)
	const [leaderUsers, setLeaderUsers] = useState<UserWithRole[]>([])
	const [loadingLeaderUsers, setLoadingLeaderUsers] = useState(false)

	const validation = useUserAccessValidation(user)

	// Numeric suffix from level code e.g. "LEVEL_3" → 3; null for non-numeric codes
	const getLevelSuffix = (code: string): number | null => {
		const m = /^LEVEL_(\d+)$/.exec(code)
		return m ? parseInt(m[1], 10) : null
	}

	const selectedLevelObj =
		levels.find((l) => l.idLevel === selectedLevelId) ?? null
	const selectedLevelSuffix = selectedLevelObj
		? getLevelSuffix(selectedLevelObj.code)
		: null

	// OVERRIDE levels with numeric suffix strictly greater than the user's level
	const leaderLevels = levels.filter((l) => {
		if (l.beneficiaryMode !== 'OVERRIDE') return false
		const suffix = getLevelSuffix(l.code)
		if (suffix === null) return false
		if (selectedLevelSuffix === null) return false
		return suffix > selectedLevelSuffix
	})

	const showLeaderSection =
		selectedLevelId !== null && selectedLevelSuffix !== null

	// Reset leader fields when user's level changes
	useEffect(() => {
		setSelectedLeaderLevelId(null)
		setSelectedLeaderId('')
		setLeaderUsers([])
	}, [selectedLevelId])

	// Fetch users when leader level is selected
	useEffect(() => {
		if (!selectedLeaderLevelId) {
			setLeaderUsers([])
			setSelectedLeaderId('')
			return
		}
		let cancelled = false
		setLoadingLeaderUsers(true)
		const params = new URLSearchParams({
			query: '',
			idLevel: selectedLeaderLevelId.toString(),
			beneficiaryMode: 'OVERRIDE',
		})
		apiClient
			.get<ApiResponse<UserWithRole[]>>(`/users/search?${params.toString()}`)
			.then((res) => {
				if (!cancelled) setLeaderUsers(res.data ?? [])
			})
			.finally(() => {
				if (!cancelled) setLoadingLeaderUsers(false)
			})
		return () => {
			cancelled = true
		}
	}, [selectedLeaderLevelId])

	// Track changes
	useEffect(() => {
		const activeChanged = active !== user.active
		const roleChanged = selectedRoleId !== (user.role?.id || null)
		const categoryChanged = selectedCategoryId !== (user.category?.id || null)
		const levelChanged = selectedLevelId !== (user.level?.id || null)
		const leaderNumericId = selectedLeaderId ? parseInt(selectedLeaderId) : null
		const leaderChanged = leaderNumericId !== (user.leader?.id || null)
		setHasChanges(
			activeChanged ||
				roleChanged ||
				categoryChanged ||
				levelChanged ||
				leaderChanged
		)
	}, [
		active,
		selectedRoleId,
		selectedCategoryId,
		selectedLevelId,
		selectedLeaderId,
		user.active,
		user.role,
		user.category,
		user.level,
		user.leader,
	])

	const handleSaveClick = () => {
		const isDeactivating = !active && user.active
		if (isDeactivating) {
			setShowDeactivateDialog(true)
		} else {
			handleSave()
		}
	}

	const handleSave = async () => {
		setValidationError(null)

		const selectedRole = roles.find((r) => r.id === selectedRoleId)
		const roleCode = selectedRole?.code || null

		const leaderNumericId = selectedLeaderId ? parseInt(selectedLeaderId) : null

		const validationData: {
			active?: boolean
			roleId?: number | null
			categoryId?: number | null
			levelId?: number | null
			leaderId?: number | null
		} = {
			categoryId: selectedCategoryId,
			levelId: selectedLevelId,
			leaderId: leaderNumericId,
		}

		try {
			const schema = updateUserSchema(roleCode, user.id)
			schema.parse(validationData)
		} catch (error) {
			if (error instanceof Error) {
				setValidationError(error.message)
			} else if (
				typeof error === 'object' &&
				error !== null &&
				'errors' in error
			) {
				const zodError = error as { errors: Array<{ message: string }> }
				setValidationError(zodError.errors[0]?.message || 'Error de validación')
			} else {
				setValidationError('Error de validación')
			}
			return
		}

		const updates: {
			active?: boolean
			roleId?: number | null
			categoryId?: number | null
			levelId?: number | null
			leaderId?: number | null
		} = {}

		if (active !== user.active) {
			updates.active = active
		}

		if (selectedRoleId !== (user.role?.id || null)) {
			updates.roleId = selectedRoleId
		}

		if (selectedCategoryId !== (user.category?.id || null)) {
			updates.categoryId = selectedCategoryId
		}

		if (selectedLevelId !== (user.level?.id || null)) {
			updates.levelId = selectedLevelId
		}

		const leaderChanged = leaderNumericId !== (user.leader?.id || null)
		if (leaderChanged) {
			updates.leaderId = leaderNumericId
		}

		if (Object.keys(updates).length > 0) {
			await onUpdate(updates)
		}
	}

	const handleDeactivateConfirm = async () => {
		setShowDeactivateDialog(false)
		await handleSave()
	}

	const selectedRole = roles.find((r) => r.id === selectedRoleId)
	const willHaveDefaultRole = isDefaultRole(selectedRole?.code)

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Shield className="h-5 w-5" />
						Administración de Usuario
					</CardTitle>
					<CardDescription>
						Gestiona el estado y permisos del usuario
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Warning Messages */}
					{validation.hasAccessIssue && (
						<Alert variant="destructive">
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>Usuario sin acceso al sistema</AlertTitle>
							<AlertDescription>
								{validation.accessIssues.map((issue, index) => (
									<p key={index}>• {issue}</p>
								))}
							</AlertDescription>
						</Alert>
					)}

					{/* Warning for selecting DEFAULT role */}
					{willHaveDefaultRole &&
						selectedRoleId !== (user.role?.id || null) && (
							<Alert
								variant="default"
								className="border-orange-500 bg-orange-50"
							>
								<AlertTriangle className="h-4 w-4 text-orange-600" />
								<AlertTitle className="text-orange-900">Advertencia</AlertTitle>
								<AlertDescription className="text-orange-800">
									{WARNING_MESSAGES.DEFAULT_ROLE_SELECTED}
								</AlertDescription>
							</Alert>
						)}

					{/* Validation Error */}
					{validationError && (
						<Alert variant="destructive">
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>Error de validación</AlertTitle>
							<AlertDescription>{validationError}</AlertDescription>
						</Alert>
					)}

					{/* Active Status Toggle */}
					<div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
								<Power className="h-5 w-5 text-muted-foreground" />
							</div>
							<div className="space-y-0.5">
								<Label htmlFor="active-toggle" className="text-base">
									Estado del Usuario
								</Label>
								<p className="text-sm text-muted-foreground">
									{active
										? 'El usuario puede acceder al sistema'
										: 'El usuario no puede acceder al sistema'}
								</p>
							</div>
						</div>
						<Switch
							id="active-toggle"
							checked={active}
							onCheckedChange={setActive}
							disabled={isLoading}
						/>
					</div>

					{/* Role Selection */}
					<div className="space-y-3">
						<Label htmlFor="role-select">Rol del Usuario</Label>
						<Select
							value={selectedRoleId?.toString() || 'none'}
							onValueChange={(value) =>
								setSelectedRoleId(value === 'none' ? null : parseInt(value))
							}
							disabled={isLoading || loadingRoles}
						>
							<SelectTrigger id="role-select">
								{loadingRoles ? (
									<SelectLoading />
								) : (
									<SelectValue placeholder="Seleccionar rol" />
								)}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Sin rol asignado</SelectItem>
								{roles.map((role) => (
									<SelectItem key={role.id} value={role.id.toString()}>
										{role.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-sm text-muted-foreground">
							El rol determina los permisos y accesos del usuario en el sistema
						</p>
					</div>

					{/* Category Selection */}
					<div className="space-y-3">
						<Label htmlFor="category-select">
							Categoría
							{selectedRole?.code === 'AGENTE' && (
								<span className="text-red-500 ml-1">*</span>
							)}
						</Label>
						<Select
							value={selectedCategoryId?.toString() || 'none'}
							onValueChange={(value) =>
								setSelectedCategoryId(value === 'none' ? null : parseInt(value))
							}
							disabled={isLoading || loadingCategories}
						>
							<SelectTrigger
								id="category-select"
								className="focus-visible:ring-2 transition-all duration-200"
							>
								{loadingCategories ? (
									<SelectLoading />
								) : (
									<SelectValue placeholder="Seleccionar categoría" />
								)}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Sin categoría asignada</SelectItem>
								{allCategories.map((category) => (
									<SelectItem
										key={category.id}
										value={category.id.toString()}
										className="cursor-pointer transition-colors duration-200"
									>
										{category.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-sm text-muted-foreground"></p>
					</div>

					{/* Level (Jerarquía) Selection */}
					<div className="space-y-3">
						<Label htmlFor="level-select">Nivel (Jerarquía)</Label>
						<Select
							value={selectedLevelId?.toString() || 'none'}
							onValueChange={(value) =>
								setSelectedLevelId(value === 'none' ? null : parseInt(value))
							}
							disabled={isLoading || loadingLevels}
						>
							<SelectTrigger
								id="level-select"
								className="focus-visible:ring-2 transition-all duration-200"
							>
								{loadingLevels ? (
									<SelectLoading />
								) : (
									<SelectValue placeholder="Seleccionar nivel jerárquico" />
								)}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Sin nivel asignado</SelectItem>
								{levels.map((level) => (
									<SelectItem
										key={level.idLevel}
										value={level.idLevel.toString()}
										className="cursor-pointer transition-colors duration-200"
									>
										{level.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-sm text-muted-foreground">
							Define el nivel jerárquico del usuario en la estructura
							organizacional y cálculos de distribución de comisiones.
						</p>
					</div>

					{/* Leader section — shown only when user has a numeric level assigned */}
					{showLeaderSection && (
						<>
							{/* Step 1: pick the leader's level */}
							<div className="space-y-3">
								<Label htmlFor="leader-level-select">Nivel de mi líder</Label>
								<Select
									value={selectedLeaderLevelId?.toString() ?? 'none'}
									onValueChange={(v) =>
										setSelectedLeaderLevelId(v === 'none' ? null : parseInt(v))
									}
									disabled={isLoading || loadingLevels}
								>
									<SelectTrigger id="leader-level-select">
										{loadingLevels ? (
											<SelectLoading />
										) : (
											<SelectValue placeholder="Seleccionar nivel del líder" />
										)}
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Sin nivel seleccionado</SelectItem>
										{leaderLevels.map((l) => (
											<SelectItem key={l.idLevel} value={l.idLevel.toString()}>
												{l.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-sm text-muted-foreground">
									Solo se muestran niveles superiores al del usuario.
								</p>
							</div>

							{/* Step 2: pick the leader from that level */}
							{selectedLeaderLevelId !== null && (
								<div className="space-y-3">
									<Label htmlFor="leader-user-select">Líder</Label>
									<Select
										value={selectedLeaderId || 'none'}
										onValueChange={(v) =>
											setSelectedLeaderId(v === 'none' ? '' : v)
										}
										disabled={isLoading || loadingLeaderUsers}
									>
										<SelectTrigger id="leader-user-select">
											{loadingLeaderUsers ? (
												<SelectLoading />
											) : (
												<SelectValue placeholder="Seleccionar líder" />
											)}
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Sin líder asignado</SelectItem>
											{leaderUsers.map((u) => (
												<SelectItem key={u.idUser} value={u.idUser.toString()}>
													{u.name} {u.lastName}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</>
					)}

					{/* Save Button */}
					<div className="flex justify-end">
						<Button
							onClick={handleSaveClick}
							disabled={!hasChanges || isLoading}
							className="gap-2 cursor-pointer"
							size="default"
						>
							<Save className="h-4 w-4" />
							{isLoading ? UI_TEXT.SAVING : UI_TEXT.SAVE_CHANGES}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Deactivate Confirmation Dialog */}
			<AlertDialog
				open={showDeactivateDialog}
				onOpenChange={setShowDeactivateDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{DIALOG_TITLES.DEACTIVATE_USER}</AlertDialogTitle>
						<AlertDialogDescription>
							{DIALOG_DESCRIPTIONS.DEACTIVATE_USER(user.name)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{UI_TEXT.CANCEL}</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeactivateConfirm}>
							{UI_TEXT.DEACTIVATE_USER}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
