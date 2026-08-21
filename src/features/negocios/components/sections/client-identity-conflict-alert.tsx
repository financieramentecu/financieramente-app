'use client'

import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/features/shared/ui/alert'
import { Button } from '@/features/shared/ui/button'

export interface ClientIdentityConflictAlertProps {
	storedIdentityNumber: string
	typedIdentityNumber: string
	/** From `canRoleEditClientInfo(currentUser.role.code)` — the server remains authoritative. */
	canUpdateDocument: boolean
	onKeep: () => void
	onUpdate: () => void
	isSubmitting?: boolean
	/** Surfaces a server rejection (e.g. non-privileged role) instead of failing silently. */
	error?: string
}

/**
 * D5: inline, non-modal alert rendered when the exact-email resolution
 * finds a client whose stored document differs from the one typed on the
 * form. The submit stays interrupted until the user picks one of the two
 * actions below.
 */
export function ClientIdentityConflictAlert({
	storedIdentityNumber,
	typedIdentityNumber,
	canUpdateDocument,
	onKeep,
	onUpdate,
	isSubmitting = false,
	error,
}: ClientIdentityConflictAlertProps) {
	return (
		<Alert variant="destructive" className="border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
			<AlertTriangle className="size-4" />
			<AlertTitle>Documento distinto encontrado</AlertTitle>
			<AlertDescription className="space-y-3">
				<p>
					Encontramos un cliente con este email pero con un documento
					distinto al que ingresaste: {storedIdentityNumber}
				</p>
				<p className="text-xs">
					Documento ingresado: <strong>{typedIdentityNumber}</strong>
				</p>
				<div className="flex flex-col gap-1">
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							variant="default"
							disabled={!canUpdateDocument || isSubmitting}
							onClick={onUpdate}
						>
							Actualizar documento
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={isSubmitting}
							onClick={onKeep}
						>
							Mantener el existente
						</Button>
					</div>
					{!canUpdateDocument && (
						<p className="text-xs text-amber-700 dark:text-amber-400">
							No tienes permisos para actualizar el documento del cliente.
						</p>
					)}
				</div>
				{error && (
					<p className="text-xs font-medium text-red-600 dark:text-red-400">
						{error}
					</p>
				)}
			</AlertDescription>
		</Alert>
	)
}
