'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { NegocioDistribucionDetalle } from '../types/types'
import { formatCurrency, formatPct } from '../lib/format-utils'

interface AcordeonNegocioDistribucionProps {
	negocios: NegocioDistribucionDetalle[]
}

/**
 * Accordion of per-business distribution detail. Each item opens a table with
 * one row per category (General/Agencia/Líder/Coach) showing commission,
 * discount, clawback and final net amount.
 */
export function AcordeonNegocioDistribucion({
	negocios,
}: AcordeonNegocioDistribucionProps) {
	if (negocios.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
				No hay negocios en esta distribución.
			</div>
		)
	}
	return (
		<div className="space-y-3">
			{negocios.map((n) => (
				<NegocioItem key={n.idSettlementCommission} negocio={n} />
			))}
		</div>
	)
}

function NegocioItem({ negocio }: { negocio: NegocioDistribucionDetalle }) {
	const [open, setOpen] = useState(false)
	const Icon = open ? ChevronDown : ChevronRight
	const status = negocio.statusSettlement.toUpperCase()
	const isSettled = status === 'SETTLED'
	return (
		<div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
			<button
				type="button"
				className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
			>
				<Icon className="h-4 w-4 text-muted-foreground shrink-0" />
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-sm font-semibold text-foreground">
							{negocio.nombreCliente ?? 'Cliente sin nombre'}
						</span>
						{negocio.contrato && (
							<span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
								{negocio.contrato}
							</span>
						)}
						{negocio.producto && (
							<span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
								{negocio.producto}
							</span>
						)}
						{isSettled && (
							<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
								Liquidado
							</span>
						)}
					</div>
					<p className="mt-0.5 text-xs text-muted-foreground">
						{negocio.origen ? `Origen: ${negocio.origen}` : 'Sin origen'}
						{' · '}
						{negocio.filas.length} categorías
					</p>
				</div>
				<div className="text-right shrink-0">
					<p className="text-xs text-muted-foreground">Neta</p>
					<p className="text-sm font-bold text-primary tabular-nums">
						{formatCurrency(negocio.totalNeta)}
					</p>
				</div>
			</button>
			{open && (
				<div className="border-t border-border bg-muted/20 p-4">
					<div className="mb-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
						<InlineStat
							label="Bruta negocio"
							value={formatCurrency(negocio.totalBruta)}
						/>
						<InlineStat
							label="Descuento"
							value={formatCurrency(negocio.totalDescuento)}
						/>
						<InlineStat
							label="Clawback"
							value={formatCurrency(negocio.totalClawback)}
						/>
						<InlineStat
							label="Comisión total del negocio"
							value={formatCurrency(negocio.comisionTotal)}
						/>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full border-collapse text-xs">
							<thead>
								<tr className="border-b border-border text-left text-muted-foreground">
									<th className="px-2 py-2 font-medium">Categoría</th>
									<th className="px-2 py-2 text-right font-medium">
										% Cat.
									</th>
									<th className="px-2 py-2 text-right font-medium">
										Bruta
									</th>
									<th className="px-2 py-2 text-right font-medium">
										% Desc.
									</th>
									<th className="px-2 py-2 text-right font-medium">
										Descuento
									</th>
									<th className="px-2 py-2 text-right font-medium">
										Post-desc.
									</th>
									<th className="px-2 py-2 text-right font-medium">
										% CB
									</th>
									<th className="px-2 py-2 text-right font-medium">
										Clawback
									</th>
									<th className="px-2 py-2 text-right font-medium text-primary">
										Neta
									</th>
								</tr>
							</thead>
							<tbody>
								{negocio.filas.map((f) => (
									<tr
										key={f.idComissionDistribution}
										className="border-b border-border/60 last:border-none"
									>
										<td className="px-2 py-1.5 font-medium text-foreground">
											{f.categoria}
										</td>
										<td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
											{formatPct(f.porcentajeCategoria)}
										</td>
										<td className="px-2 py-1.5 text-right tabular-nums">
											{formatCurrency(f.comisionBruta)}
										</td>
										<td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
											{formatPct(f.porcentajeDescuento)}
										</td>
										<td className="px-2 py-1.5 text-right tabular-nums">
											{formatCurrency(f.totalDescuento)}
										</td>
										<td className="px-2 py-1.5 text-right tabular-nums">
											{formatCurrency(f.comisionPostDescuento)}
										</td>
										<td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
											{f.porcentajeClawback != null
												? formatPct(f.porcentajeClawback)
												: '—'}
										</td>
										<td className="px-2 py-1.5 text-right tabular-nums">
											{f.totalClawback != null
												? formatCurrency(f.totalClawback)
												: '—'}
										</td>
										<td className="px-2 py-1.5 text-right tabular-nums font-semibold text-primary">
											{formatCurrency(f.comisionNeta)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	)
}

function InlineStat({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="text-[11px] uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p className="text-sm font-semibold tabular-nums text-foreground">
				{value}
			</p>
		</div>
	)
}
