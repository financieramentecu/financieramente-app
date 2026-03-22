'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'

interface BarraAccionesLiquidacionProps {
	selectedCount: number
	onLiquidar: () => void
	onRezagar: () => void
	isLiquidando: boolean
	isRezagando: boolean
}

/**
 * Sticky action bar for bulk Liquidar / Rezagar. Buttons disabled when none selected or when loading.
 */
export function BarraAccionesLiquidacion({
	selectedCount,
	onLiquidar,
	onRezagar,
	isLiquidando,
	isRezagando,
}: BarraAccionesLiquidacionProps) {
	const disabled = selectedCount === 0 || isLiquidando || isRezagando

	return (
		<div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-border bg-background py-3 px-4">
			<span className="text-sm text-muted-foreground">
				{selectedCount > 0
					? `${selectedCount} registro(s) seleccionado(s)`
					: 'Seleccione al menos un registro para liquidar o rezagar'}
			</span>
			<div className="flex gap-2">
				<Button
					onClick={onLiquidar}
					disabled={disabled}
					className="cursor-pointer min-h-[44px]"
				>
					{isLiquidando ? (
						<Loader2 className="h-4 w-4 animate-spin mr-2" />
					) : null}
					Liquidar
				</Button>
				<Button
					variant="outline"
					onClick={onRezagar}
					disabled={disabled}
					className="cursor-pointer min-h-[44px]"
				>
					{isRezagando ? (
						<Loader2 className="h-4 w-4 animate-spin mr-2" />
					) : null}
					Rezagar
				</Button>
			</div>
		</div>
	)
}
