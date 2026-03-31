'use client'

import { ExternalLink, BarChart2 } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import type { RegistroLiquidacionDetalle } from '../types/types'
import { formatCurrency, formatPct, formatDate } from '../lib/format-utils'

interface RegistrosLiquidacionTableProps {
	registros: RegistroLiquidacionDetalle[]
	fileType: string
	selectedIds: Set<number>
	onSelectionChange: (ids: Set<number>) => void
	onVerNegocio: (idBusiness: number) => void
	onVerDistribucion: (idSettlementCommission: number) => void
}

const VOLUNTARIA = 'VOLUNTARIA'

function BoolBadge({ value, trueLabel = 'Sí', falseLabel = 'No' }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
	return value ? (
		<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
			<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
			{trueLabel}
		</span>
	) : (
		<span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
			<span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
			{falseLabel}
		</span>
	)
}

export function RegistrosLiquidacionTable({
	registros,
	fileType,
	selectedIds,
	onSelectionChange,
	onVerNegocio,
	onVerDistribucion,
}: RegistrosLiquidacionTableProps) {
	const isVoluntaria = fileType === VOLUNTARIA
	const allIds = registros.map((r) => r.idSettlementCommission)
	const allSelected =
		allIds.length > 0 && allIds.every((id) => selectedIds.has(id))

	function toggleAll() {
		if (allSelected) {
			onSelectionChange(new Set())
		} else {
			onSelectionChange(new Set(allIds))
		}
	}

	function toggleOne(id: number) {
		const next = new Set(selectedIds)
		if (next.has(id)) next.delete(id)
		else next.add(id)
		onSelectionChange(next)
	}

	const thClass = 'py-3 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap'
	const thRight = `${thClass} text-right`

	return (
		<div className="rounded-lg border border-border overflow-hidden shadow-sm">
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-muted/60 border-b border-border">
							<th className="w-10 py-3 px-4 text-center" scope="col">
								<input
									type="checkbox"
									checked={allSelected}
									onChange={toggleAll}
									aria-label="Seleccionar todos"
									className="cursor-pointer rounded border-border accent-primary"
								/>
							</th>
							<th className={thClass} scope="col">Contrato</th>
							<th className={thClass} scope="col">Asesor</th>
							<th className={thRight} scope="col">Comisión</th>
							<th className={thRight} scope="col">% Desc.</th>
							{!isVoluntaria && (
								<>
									<th className={thRight} scope="col">% Clawback</th>
									<th className={`${thClass} text-center`} scope="col">Clawback</th>
								</>
							)}
							<th className={`${thClass} text-center`} scope="col">Rezagado</th>
							<th className={thClass} scope="col">F. Sincronización</th>
							{!isVoluntaria && (
								<th className={thClass} scope="col">F. Rezagado</th>
							)}
							{isVoluntaria && (
								<>
									<th className={thClass} scope="col">Fecha Inicio</th>
									<th className={thClass} scope="col">Fecha Fin</th>
								</>
							)}
							<th className={`${thClass} text-right`} scope="col">Acciones</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{registros.map((r, idx) => (
							<tr
								key={r.idSettlementCommission}
								className={`hover:bg-primary/5 transition-colors duration-100 ${selectedIds.has(r.idSettlementCommission) ? 'bg-primary/5' : idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
							>
								<td className="py-3 px-4 text-center">
									<input
										type="checkbox"
										checked={selectedIds.has(r.idSettlementCommission)}
										onChange={() => toggleOne(r.idSettlementCommission)}
										aria-label={`Seleccionar registro ${r.idSettlementCommission}`}
										className="cursor-pointer rounded border-border accent-primary"
									/>
								</td>
								<td className="py-3 px-4">
									<span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
										{r.contrato ?? '—'}
									</span>
								</td>
								<td className="py-3 px-4">
									<span className="font-medium text-foreground">{r.nombreAsesor}</span>
								</td>
								<td className="py-3 px-4 text-right font-semibold text-foreground tabular-nums">
									{formatCurrency(r.monto)}
								</td>
								<td className="py-3 px-4 text-right text-muted-foreground tabular-nums">
									{formatPct(r.porcentajeDescuento)}
								</td>
								{!isVoluntaria && (
									<>
										<td className="py-3 px-4 text-right text-muted-foreground tabular-nums">
											{formatPct(r.porcentajeClawback)}
										</td>
										<td className="py-3 px-4 text-center">
											<BoolBadge value={r.esClawback} />
										</td>
									</>
								)}
								<td className="py-3 px-4 text-center">
									<BoolBadge
										value={r.esRezagado}
										trueLabel="Sí"
										falseLabel="No"
									/>
								</td>
								<td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
									{formatDate(r.fechaSincronizacion)}
								</td>
								{!isVoluntaria && (
									<td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
										{formatDate(r.fechaRezagado)}
									</td>
								)}
								{isVoluntaria && (
									<>
										<td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
											{r.fechaInicio ?? '—'}
										</td>
										<td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
											{r.fechaFin ?? '—'}
										</td>
									</>
								)}
								<td className="py-3 px-4 text-right">
									<div className="flex items-center justify-end gap-1.5">
										{r.idBusiness != null ? (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onVerNegocio(r.idBusiness!)}
												className="h-7 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10"
											>
												<ExternalLink className="h-3 w-3 mr-1" />
												Negocio
											</Button>
										) : null}
										<Button
											variant="outline"
											size="sm"
											onClick={() => onVerDistribucion(r.idSettlementCommission)}
											className="h-7 px-2.5 text-xs"
										>
											<BarChart2 className="h-3 w-3 mr-1" />
											Distribución
										</Button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
