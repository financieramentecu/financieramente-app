'use client'

import { Loader2, DollarSign, Tag, Package, MapPin, User } from 'lucide-react'
import { Modal } from '@/features/shared/ui/modal'
import { useDistribucionComision } from '../hooks/use-distribucion-comision'
import { formatCurrency, formatPct } from '../lib/format-utils'

interface ModalDetalleDistribucionProps {
	idSettlementCommission: number | null
	open: boolean
	onClose: () => void
}

function StatCard({
	icon: Icon,
	label,
	value,
}: {
	icon: React.ElementType
	label: string
	value: string
}) {
	return (
		<div className="flex items-start gap-3 rounded-lg bg-muted/40 border border-border p-3">
			<div className="rounded-md bg-primary/10 p-1.5 shrink-0">
				<Icon className="h-3.5 w-3.5 text-primary" />
			</div>
			<div className="min-w-0">
				<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-none mb-1">
					{label}
				</p>
				<p className="text-sm font-semibold text-foreground truncate">
					{value}
				</p>
			</div>
		</div>
	)
}

/**
 * Modal that lazily fetches and displays the commission distribution breakdown
 * for a given settlement commission.
 */
export function ModalDetalleDistribucion({
	idSettlementCommission,
	open,
	onClose,
}: ModalDetalleDistribucionProps) {
	const { distribucion, isLoading, error } = useDistribucionComision(
		open ? idSettlementCommission : null
	)

	// Totals
	const totals = distribucion?.distribuciones.reduce(
		(acc, item) => ({
			bruta: acc.bruta + item.value_commision,
			descuento: acc.descuento + item.discount_total,
			clawback: acc.clawback + (item.value_clawback ?? 0),
			neta: acc.neta + item.comisionNeta,
		}),
		{ bruta: 0, descuento: 0, clawback: 0, neta: 0 }
	)

	const thClass =
		'py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap'
	const thRight = `${thClass} text-right`

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
					className="flex flex-col items-center justify-center gap-3 py-12"
					aria-label="Cargando distribución"
				>
					<Loader2 className="h-8 w-8 animate-spin text-primary/40" />
					<p className="text-sm text-muted-foreground">
						Cargando distribución...
					</p>
				</div>
			)}

			{!isLoading && error && (
				<div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
					{error}
				</div>
			)}

			{!isLoading && !error && distribucion && (
				<div className="space-y-5">
					{/* Summary cards */}
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
						<StatCard
							icon={DollarSign}
							label="Valor Comisión"
							value={
								distribucion.commission_value !== undefined
									? formatCurrency(distribucion.commission_value)
									: '—'
							}
						/>
						<StatCard
							icon={Tag}
							label="Categoría"
							value={distribucion.categoria ?? '—'}
						/>
						<StatCard
							icon={Package}
							label="Producto"
							value={distribucion.producto ?? '—'}
						/>
						<StatCard
							icon={MapPin}
							label="Origen"
							value={distribucion.origen ?? '—'}
						/>
						<StatCard
							icon={User}
							label="Asesor"
							value={distribucion.nombreAsesor ?? '—'}
						/>
					</div>

					{/* Distribution table */}
					{distribucion.distribuciones.length === 0 ? (
						<div className="py-8 text-center text-sm text-muted-foreground">
							No hay distribuciones registradas para esta comisión.
						</div>
					) : (
						<div className="rounded-lg border border-border overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="bg-muted/60 border-b border-border">
											<th className={thClass}>Categoría</th>
											<th className={thClass}>Beneficiario</th>
											<th className={thRight}>% Dist.</th>
											<th className={thRight}>Com. Dist.</th>
											<th className={thRight}>% Desc.</th>
											<th className={thRight}>Desc. Total</th>
											<th className={thRight}>% Clawback</th>
											<th className={thRight}>Clawback</th>
											<th className={`${thRight} text-primary`}>Com. Final</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{distribucion.distribuciones.map((item, idx) => (
											<tr
												key={item.idComissionDistribution}
												className={`hover:bg-primary/5 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
											>
												<td className="py-3 px-3">
													<span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
														{item.categoria}
													</span>
												</td>
												<td className="py-3 px-3 text-foreground font-medium">
													{item.beneficiarioNombre || '—'}
												</td>
												<td className="py-3 px-3 text-right text-muted-foreground tabular-nums">
													{formatPct(item.commission_porcentaje)}
												</td>
												<td className="py-3 px-3 text-right text-foreground tabular-nums">
													{formatCurrency(item.value_commision)}
												</td>
												<td className="py-3 px-3 text-right text-muted-foreground tabular-nums">
													{formatPct(item.applied_discount_percentace)}
												</td>
												<td className="py-3 px-3 text-right text-muted-foreground tabular-nums">
													{formatCurrency(item.discount_total)}
												</td>
												<td className="py-3 px-3 text-right text-muted-foreground tabular-nums">
													{item.percentaje_applied != null
														? formatPct(item.percentaje_applied)
														: '—'}
												</td>
												<td className="py-3 px-3 text-right text-muted-foreground tabular-nums">
													{item.value_clawback != null
														? formatCurrency(item.value_clawback)
														: '—'}
												</td>
												<td className="py-3 px-3 text-right">
													<span className="font-bold text-primary tabular-nums text-sm">
														{formatCurrency(item.comisionNeta)}
													</span>
												</td>
											</tr>
										))}
									</tbody>
									{/* Totals row */}
									{totals && (
										<tfoot>
											<tr className="bg-muted/60 border-t-2 border-border">
												<td
													colSpan={3}
													className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
												>
													Total
												</td>
												<td className="py-2.5 px-3 text-right font-bold text-foreground tabular-nums text-sm">
													{formatCurrency(totals.bruta)}
												</td>
												<td className="py-2.5 px-3" />
												<td className="py-2.5 px-3 text-right font-bold text-foreground tabular-nums text-sm">
													{formatCurrency(totals.descuento)}
												</td>
												<td className="py-2.5 px-3" />
												<td className="py-2.5 px-3 text-right font-bold text-foreground tabular-nums text-sm">
													{formatCurrency(totals.clawback)}
												</td>
												<td className="py-2.5 px-3 text-right">
													<span className="font-bold text-primary tabular-nums text-sm">
														{formatCurrency(totals.neta)}
													</span>
												</td>
											</tr>
										</tfoot>
									)}
								</table>
							</div>
						</div>
					)}
				</div>
			)}
		</Modal>
	)
}
