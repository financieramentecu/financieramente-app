'use client'

import { Loader2 } from 'lucide-react'
import { Modal } from '@/features/shared/ui/modal'
import { useDistribucionComision } from '../hooks/use-distribucion-comision'

interface ModalDetalleDistribucionProps {
	idSettlementCommission: number | null
	open: boolean
	onClose: () => void
}

function formatNumber(value: number): string {
	return new Intl.NumberFormat('es-CO', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(value)
}

function formatPct(value: number): string {
	return `${formatNumber(value * 100)}%`
}

/**
 * Modal that lazily fetches and displays the commission distribution breakdown
 * for a given settlement commission. Follows the ModalVerNegocio pattern.
 */
export function ModalDetalleDistribucion({
	idSettlementCommission,
	open,
	onClose,
}: ModalDetalleDistribucionProps) {
	const { distribucion, isLoading, error } = useDistribucionComision(
		open ? idSettlementCommission : null
	)

	return (
		<Modal
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose()
			}}
			title="Detalle de Distribución de Comisión"
			size="xl"
			className="max-w-6xl"
		>
			{isLoading && (
				<div
					className="flex items-center justify-center py-8"
					aria-label="Cargando distribución"
				>
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			)}

			{!isLoading && error && (
				<div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
					{error}
				</div>
			)}

			{!isLoading && !error && distribucion && (
				<div className="space-y-4">
					{/* Header section */}
					<div className="grid grid-cols-2 lg:grid-cols-3 gap-3 rounded-md border border-border bg-muted/30 p-4 text-sm">
						<div>
							<span className="font-medium text-foreground">Comisión Total:</span>{' '}
							<span className="text-muted-foreground font-semibold">
								${distribucion.commission_value !== undefined ? formatNumber(distribucion.commission_value) : '—'}
							</span>
						</div>
						<div>
							<span className="font-medium text-foreground">Categoría:</span>{' '}
							<span className="text-muted-foreground">
								{distribucion.categoria ?? '—'}
							</span>
						</div>
						<div>
							<span className="font-medium text-foreground">Producto:</span>{' '}
							<span className="text-muted-foreground">
								{distribucion.producto ?? '—'}
							</span>
						</div>
						<div>
							<span className="font-medium text-foreground">Origen:</span>{' '}
							<span className="text-muted-foreground">
								{distribucion.origen ?? '—'}
							</span>
						</div>
						<div>
							<span className="font-medium text-foreground">Asesor:</span>{' '}
							<span className="text-muted-foreground">
								{distribucion.nombreAsesor ?? '—'}
							</span>
						</div>
					</div>

					{/* Distribution rows table */}
					{distribucion.distribuciones.length === 0 ? (
						<div className="py-6 text-center text-sm text-muted-foreground">
							No hay distribuciones registradas para esta comisión.
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-border">
										<th className="py-2 px-3 text-left font-semibold text-foreground">
											Categoría
										</th>
										<th className="py-2 px-3 text-right font-semibold text-foreground">
											% Dist. de Comisión
										</th>
										<th className="py-2 px-3 text-right font-semibold text-foreground">
											Comisión Bruta
										</th>
										<th className="py-2 px-3 text-right font-semibold text-foreground">
											% Descuento
										</th>
										<th className="py-2 px-3 text-right font-semibold text-foreground">
											Total Descuento
										</th>
										<th className="py-2 px-3 text-right font-semibold text-foreground">
											% Clawback
										</th>
										<th className="py-2 px-3 text-right font-semibold text-foreground">
											Descuento Clawback
										</th>
										<th className="py-2 px-3 text-right font-semibold text-foreground">
											Comisión Final
										</th>
									</tr>
								</thead>
								<tbody>
									{distribucion.distribuciones.map((item) => (
										<tr
											key={item.idComissionDistribution}
											className="border-b border-border hover:bg-muted/50 transition-colors duration-150"
										>
											<td className="py-2 px-3 text-foreground">
												{item.categoria}
											</td>
											<td className="py-2 px-3 text-right text-muted-foreground bg-muted/20">
												{formatPct(item.commission_porcentaje)}
											</td>
											<td className="py-2 px-3 text-right text-foreground">
												{formatNumber(item.value_commision)}
											</td>
											<td className="py-2 px-3 text-right text-muted-foreground">
												{formatPct(item.applied_discount_percentace)}
											</td>
											<td className="py-2 px-3 text-right text-muted-foreground">
												{formatNumber(item.discount_total)}
											</td>
											<td className="py-2 px-3 text-right text-muted-foreground">
												{item.percentaje_applied != null ? formatPct(item.percentaje_applied) : '—'}
											</td>
											<td className="py-2 px-3 text-right text-muted-foreground">
												{item.value_clawback != null
													? formatNumber(item.value_clawback)
													: '—'}
											</td>
											<td className="py-2 px-3 text-right font-bold text-foreground">
												{formatNumber(item.comisionNeta)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}
		</Modal>
	)
}
