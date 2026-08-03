'use client'

/**
 * Botón de acción para marcar/desmarcar la novedad de un negocio.
 * Reutilizable entre BusinessViewModal y la vista de detalle.
 */

import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { cn } from '@/lib/utils'
import { useMarkNovedad } from '../../hooks/use-mark-novedad'
import {
	BUSINESS_STATUS,
	BUSINESS_NOVEDAD_STATUS,
	type BusinessStatus,
	type BusinessNovedadStatus,
	type BusinessEntity,
} from '../../types/business-entity.types'

interface NovedadActionButtonProps {
	businessId: number
	businessStatus: BusinessStatus
	novedadStatus: BusinessNovedadStatus | null
	onSuccess?: (business: BusinessEntity) => void
}

export function NovedadActionButton({
	businessId,
	businessStatus,
	novedadStatus,
	onSuccess,
}: NovedadActionButtonProps) {
	const router = useRouter()
	const { state, mark, unmark } = useMarkNovedad(businessId)
	const isLoading = state.status === 'loading'

	const canMark =
		businessStatus === BUSINESS_STATUS.VENTA_EFECTUADA &&
		novedadStatus !== BUSINESS_NOVEDAD_STATUS.PENDIENTE
	const canUnmark = novedadStatus === BUSINESS_NOVEDAD_STATUS.PENDIENTE

	if (!canMark && !canUnmark) {
		return null
	}

	const handleClick = async () => {
		const result = canUnmark ? await unmark() : await mark()
		if (result.data) {
			toast.success(canUnmark ? 'Novedad desmarcada' : 'Negocio marcado con novedad')
			onSuccess?.(result.data)
			router.refresh()
		} else if (result.error) {
			toast.error(result.error)
		}
	}

	return (
		<Button
			variant="outline"
			size="sm"
			disabled={isLoading}
			onClick={() => void handleClick()}
			className={cn(
				'cursor-pointer gap-1.5',
				canUnmark
					? 'border-muted-foreground/30 text-muted-foreground hover:bg-muted'
					: 'border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100'
			)}
		>
			{canUnmark ? <X className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
			{canUnmark ? 'Desmarcar Novedad' : 'Marcar Con Novedad'}
		</Button>
	)
}
