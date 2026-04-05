'use client'

import { Loader2, DollarSign, Tag, Package, MapPin, User } from 'lucide-react'
import { Modal } from '@/features/shared/ui/modal'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
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
			postDesc: acc.postDesc + item.value_commission_with_discount,
			clawback: acc.clawback + (item.value_clawback ?? 0),
			neta: acc.neta + item.comisionNeta,
		}),
		{ bruta: 0, descuento: 0, postDesc: 0, clawback: 0, neta: 0 }
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
						<DataTable
							columns={[
								{
									accessorKey: 'categoria',
									header: 'Categoría',
									cell: ({ row }) => (
										<span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
											{row.original.categoria}
										</span>
									),
									footer: () => 'Total',
								},
								{
									accessorKey: 'beneficiarioNombre',
									header: 'Beneficiario',
									cell: ({ row }) => row.original.beneficiarioNombre || '—',
								},
								{
									accessorKey: 'commission_porcentaje',
									header: () => <div className="text-right">% Dist.</div>,
									cell: ({ row }) => (
										<div className="text-right text-muted-foreground tabular-nums">
											{formatPct(row.original.commission_porcentaje)}
										</div>
									),
								},
								{
									accessorKey: 'value_commision',
									header: () => <div className="text-right">Com. Dist.</div>,
									cell: ({ row }) => (
										<div className="text-right text-foreground tabular-nums">
											{formatCurrency(row.original.value_commision)}
										</div>
									),
									footer: () => (
										<div className="text-right font-bold text-foreground tabular-nums text-sm">
											{formatCurrency(totals?.bruta || 0)}
										</div>
									),
								},
								{
									accessorKey: 'applied_discount_percentace',
									header: () => <div className="text-right">% Desc.</div>,
									cell: ({ row }) => (
										<div className="text-right text-muted-foreground tabular-nums">
											{formatPct(row.original.applied_discount_percentace)}
										</div>
									),
								},
								{
									accessorKey: 'discount_total',
									header: () => <div className="text-right">Desc. Total</div>,
									cell: ({ row }) => (
										<div className="text-right text-muted-foreground tabular-nums">
											{formatCurrency(row.original.discount_total)}
										</div>
									),
									footer: () => (
										<div className="text-right font-bold text-foreground tabular-nums text-sm">
											{formatCurrency(totals?.descuento || 0)}
										</div>
									),
								},
								{
									accessorKey: 'value_commission_with_discount',
									header: () => (
										<div className="text-right">Com. Dist. con descuento</div>
									),
									cell: ({ row }) => (
										<div className="text-right text-foreground tabular-nums">
											{formatCurrency(row.original.value_commission_with_discount)}
										</div>
									),
									footer: () => (
										<div className="text-right font-bold text-foreground tabular-nums text-sm">
											{formatCurrency(totals?.postDesc || 0)}
										</div>
									),
								},
								{
									accessorKey: 'percentaje_applied',
									header: () => <div className="text-right">% Clawback</div>,
									cell: ({ row }) => (
										<div className="text-right text-muted-foreground tabular-nums">
											{row.original.percentaje_applied != null
												? formatPct(row.original.percentaje_applied)
												: '—'}
										</div>
									),
								},
								{
									accessorKey: 'value_clawback',
									header: () => <div className="text-right">Clawback</div>,
									cell: ({ row }) => (
										<div className="text-right text-muted-foreground tabular-nums">
											{row.original.value_clawback != null
												? formatCurrency(row.original.value_clawback)
												: '—'}
										</div>
									),
									footer: () => (
										<div className="text-right font-bold text-foreground tabular-nums text-sm">
											{formatCurrency(totals?.clawback || 0)}
										</div>
									),
								},
								{
									accessorKey: 'comisionNeta',
									header: () => <div className="text-right pr-2 text-primary">Com. Final</div>,
									cell: ({ row }) => (
										<div className="text-right pr-2">
											<span className="font-bold text-primary tabular-nums text-sm">
												{formatCurrency(row.original.comisionNeta)}
											</span>
										</div>
									),
									footer: () => (
										<div className="text-right pr-2">
											<span className="font-bold text-primary tabular-nums text-sm">
												{formatCurrency(totals?.neta || 0)}
											</span>
										</div>
									),
								},
							]}
							data={distribucion.distribuciones}
							paginable={false}
							searchable={false}
							showFooter
						/>
					)}
				</div>
			)}
		</Modal>
	)
}
