'use client'

import React, { useState, useEffect } from 'react'
import { Save, Shield, Power, AlertTriangle } from 'lucide-react'
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
import { useLeaders, type Leader } from '../hooks/use-leaders'
import { useUserAccessValidation } from '../hooks/use-user-access-validation'
import { isDefaultRole } from '../utils/user-access.utils'
import { updateUserSchema } from '../lib/user-schemas'
import { useCategories } from '@/features/admin/categories/hooks/use-categories'
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
    const [selectedLeaderId, setSelectedLeaderId] = useState<number | null>(
        user.leader?.id || null
    )
    const [hasChanges, setHasChanges] = useState(false)
    const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
    const [validationError, setValidationError] = useState<string | null>(null)

    const { roles, isLoading: loadingRoles } = useRoles()
    const { categories, isLoading: loadingCategories } = useCategories({
        status: 'active',
    })
    const { leaders, isLoading: loadingLeaders } = useLeaders(user.id)
    const validation = useUserAccessValidation(user)

    // Track changes
    useEffect(() => {
        const activeChanged = active !== user.active
        const roleChanged = selectedRoleId !== (user.role?.id || null)
        const categoryChanged =
            selectedCategoryId !== (user.category?.id || null)
        const leaderChanged = selectedLeaderId !== (user.leader?.id || null)
        setHasChanges(
            activeChanged || roleChanged || categoryChanged || leaderChanged
        )
    }, [
        active,
        selectedRoleId,
        selectedCategoryId,
        selectedLeaderId,
        user.active,
        user.role,
        user.category,
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

        // Obtener el rol seleccionado para validaci?n
        const selectedRole = roles.find((r) => r.id === selectedRoleId)
        const roleCode = selectedRole?.code || null

        // Preparar datos completos para validaci?n (incluyendo valores actuales)
        const validationData: {
            active?: boolean
            roleId?: number | null
            categoryId?: number | null
            leaderId?: number | null
        } = {
            categoryId: selectedCategoryId,
            leaderId: selectedLeaderId,
        }

        // Validar con Zod antes de preparar updates
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
                setValidationError(zodError.errors[0]?.message || 'Error de validaci?n')
            } else {
                setValidationError('Error de validaci?n')
            }
            return
        }

        // Preparar updates solo con los campos que cambiaron
        const updates: {
            active?: boolean
            roleId?: number | null
            categoryId?: number | null
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

        if (selectedLeaderId !== (user.leader?.id || null)) {
            updates.leaderId = selectedLeaderId
        }

        if (Object.keys(updates).length > 0) {
            await onUpdate(updates)
        }
    }

    const handleDeactivateConfirm = async () => {
        setShowDeactivateDialog(false)
        await handleSave()
    }

    // Get selected role
    const selectedRole = roles.find((r) => r.id === selectedRoleId)
    const willHaveDefaultRole = isDefaultRole(selectedRole?.code)

    // Helper function to format leader name
    const formatLeaderName = (leader: Leader): string => {
        // Asegurarse de que tenemos un nombre válido
        const name = leader.name?.trim() || ''
        const lastName = leader.lastName?.trim() || null

        // Si no hay nombre válido, mostrar un placeholder
        if (!name) {
            return 'Sin nombre'
        }

        // Construir el nombre completo
        const fullName = lastName ? `${name} ${lastName}` : name
        return fullName.trim()
    }

    // Get selected leader for display
    const selectedLeader = leaders.find((l) => l.id === selectedLeaderId)
    const selectedLeaderName = selectedLeader
        ? formatLeaderName(selectedLeader)
        : user.leader
          ? user.leader.lastName
            ? `${user.leader.name} ${user.leader.lastName}`
            : user.leader.name
          : undefined

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
                                    <p key={index}>? {issue}</p>
                                ))}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Warning for selecting DEFAULT role */}
                    {willHaveDefaultRole && selectedRoleId !== (user.role?.id || null) && (
                        <Alert variant="default" className="border-orange-500 bg-orange-50">
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
                            <AlertTitle>Error de validaci?n</AlertTitle>
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
                                <SelectValue placeholder="Seleccionar rol" />
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
                                setSelectedCategoryId(
                                    value === 'none' ? null : parseInt(value)
                                )
                            }
                            disabled={isLoading || loadingCategories}
                        >
                            <SelectTrigger id="category-select">
                                <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin categoría asignada</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem
                                        key={category.idCategory}
                                        value={category.idCategory.toString()}
                                    >
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            {selectedRole?.code === 'AGENTE'
                                ? 'La categoría es requerida para usuarios con rol Agente/Coach'
                                : 'Asigna una categoría al usuario (opcional)'}
                        </p>
                    </div>

                    {/* Leader Selection */}
                    <div className="space-y-3">
                        <Label htmlFor="leader-select">Líder (Coach)</Label>
                        <Select
                            value={selectedLeaderId?.toString() || 'none'}
                            onValueChange={(value) =>
                                setSelectedLeaderId(
                                    value === 'none' ? null : parseInt(value)
                                )
                            }
                            disabled={isLoading || loadingLeaders}
                        >
                        <SelectTrigger id="leader-select">
                            <SelectValue
                                placeholder="Seleccionar líder"
                            >
                                {selectedLeaderName || 'Seleccionar líder'}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Sin líder asignado</SelectItem>
                            {leaders.length === 0 ? (
                                <SelectItem value="no-leaders" disabled>
                                    No hay líderes disponibles
                                </SelectItem>
                            ) : (
                                leaders.map((leader: Leader) => (
                                    <SelectItem
                                        key={leader.id}
                                        value={leader.id.toString()}
                                    >
                                        {formatLeaderName(leader)}
                                        {leader.email && (
                                            <span className="text-muted-foreground ml-2">
                                                ({leader.email})
                                            </span>
                                        )}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            Asigna un líder (coach) al usuario. Solo usuarios con rol
                            Agente/Coach pueden ser líderes.
                        </p>
                    </div>

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
            <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
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
