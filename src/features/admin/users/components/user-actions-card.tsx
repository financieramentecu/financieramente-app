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
import { useUserAccessValidation } from '../hooks/use-user-access-validation'
import { isDefaultRole } from '../utils/user-access.utils'
import {
    UI_TEXT,
    WARNING_MESSAGES,
    DIALOG_TITLES,
    DIALOG_DESCRIPTIONS,
} from '../constants/user-management.constants'

interface UserActionsCardProps {
    user: User
    onUpdate: (data: { active?: boolean; roleId?: number | null }) => Promise<void>
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
    const [hasChanges, setHasChanges] = useState(false)
    const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)

    const { roles, isLoading: loadingRoles } = useRoles()
    const validation = useUserAccessValidation(user)

    // Track changes
    useEffect(() => {
        const activeChanged = active !== user.active
        const roleChanged = selectedRoleId !== (user.role?.id || null)
        setHasChanges(activeChanged || roleChanged)
    }, [active, selectedRoleId, user.active, user.role])

    const handleSaveClick = () => {
        const isDeactivating = !active && user.active

        if (isDeactivating) {
            setShowDeactivateDialog(true)
        } else {
            handleSave()
        }
    }

    const handleSave = async () => {
        const updates: { active?: boolean; roleId?: number | null } = {}

        if (active !== user.active) {
            updates.active = active
        }

        if (selectedRoleId !== (user.role?.id || null)) {
            updates.roleId = selectedRoleId
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
                    {willHaveDefaultRole && selectedRoleId !== (user.role?.id || null) && (
                        <Alert variant="default" className="border-orange-500 bg-orange-50">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertTitle className="text-orange-900">Advertencia</AlertTitle>
                            <AlertDescription className="text-orange-800">
                                {WARNING_MESSAGES.DEFAULT_ROLE_SELECTED}
                            </AlertDescription>
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

                    {/* Save Button */}
                    <Button
                        onClick={handleSaveClick}
                        disabled={!hasChanges || isLoading}
                        className="w-full gap-2 cursor-pointer"
                    >
                        <Save className="h-4 w-4" />
                        {isLoading ? UI_TEXT.SAVING : UI_TEXT.SAVE_CHANGES}
                    </Button>
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
