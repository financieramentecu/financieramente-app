'use client'

/**
 * Trigger + modal de gestión manual de novedad (backoffice).
 * Visible únicamente para ANALISTA_SOPORTE/ADMIN cuando el negocio tiene
 * una novedad marcada (`novedadStatus` no nulo). Reutilizable entre
 * `BusinessViewModal` y la vista de detalle de negocio.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Settings2 } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { UserRole } from '@/features/auth/lib/roles'
import { useManageNovedad } from '../../hooks/use-manage-novedad'
import { BusinessNovedadManageModal } from '../modals/BusinessNovedadManageModal'
import type { BusinessEntity, BusinessNovedadStatus } from '../../types/business-entity.types'

/** Roles con permiso para gestionar manualmente el estado de novedad */
export const MANAGE_NOVEDAD_ALLOWED_ROLES: string[] = [UserRole.ADMIN, UserRole.ANALISTA_SOPORTE]

interface NovedadManageTriggerProps {
	businessId: number
	novedadStatus: BusinessNovedadStatus | null
	userRoleCode: string | null | undefined
	onSuccess?: (business: BusinessEntity) => void
}

export function NovedadManageTrigger({
	businessId,
	novedadStatus,
	userRoleCode,
	onSuccess,
}: NovedadManageTriggerProps) {
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const { updateStatus } = useManageNovedad(businessId)

	const canManage =
		novedadStatus !== null &&
		userRoleCode !== null &&
		userRoleCode !== undefined &&
		MANAGE_NOVEDAD_ALLOWED_ROLES.includes(userRoleCode)

	if (!canManage) {
		return null
	}

	// Minimal shape for the modal's read-only summary — id/novedadStatus are
	// the only fields it renders.
	const modalBusiness = { id: businessId, novedadStatus } as BusinessEntity

	const handleConfirm = async (target: BusinessNovedadStatus) => {
		const result = await updateStatus(target)
		if (result.data) {
			toast.success('Novedad actualizada')
			onSuccess?.(result.data)
			router.refresh()
		} else if (result.error) {
			toast.error(result.error)
			throw new Error(result.error)
		}
	}

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
				className="cursor-pointer gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
			>
				<Settings2 className="h-3.5 w-3.5" />
				Gestionar Novedad
			</Button>
			<BusinessNovedadManageModal
				open={open}
				onOpenChange={setOpen}
				business={modalBusiness}
				onConfirm={handleConfirm}
			/>
		</>
	)
}
