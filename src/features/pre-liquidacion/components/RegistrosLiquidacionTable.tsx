'use client'

import { Button } from '@/features/shared/ui/button'
import type { RegistroLiquidacionDetalle } from '../types/types'

interface RegistrosLiquidacionTableProps {
	registros: RegistroLiquidacionDetalle[]
	fileType: string
	selectedIds: Set<number>
	onSelectionChange: (ids: Set<number>) => void
	onVerNegocio: (idBusiness: number) => void
	onVerDistribucion: (idSettlementCommission: number) => void
}

const VOLUNTARIA = 'VOLUNTARIA'

function formatNumber(value: number): string {
	return new Intl.NumberFormat('es-CO', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(value)
}

function formatPct(value: number): string {
	return `${formatNumber(value * 100)}%`
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

	return (
		<div className="overflow-x-auto">
			<table className="w-full">
				<thead>
					<tr className="border-b border-border">
						<th className="w-10 py-3 px-4 text-center" scope="col">
							<input
								type="checkbox"
								checked={allSelected}
								onChange={toggleAll}
								aria-label="Seleccionar todos"
								className="cursor-pointer rounded border-border"
							/>
						</th>
						<th className="py-3 px-4 text-sm font-semibold text-foreground" scope="col">
							Contrato
						</th>
						<th className="py-3 px-4 text-sm font-semibold text-foreground" scope="col">
							Nombre Asesor
						</th>
						<th className="py-3 px-4 text-sm font-semibold text-foreground" scope="col">
							Monto
						</th>
						<th className="py-3 px-4 text-sm font-semibold text-foreground" scope="col">
							Base Comisión
						</th>
						<th className="py-3 px-4 text-sm font-semibold text-foreground" scope="col">
							% Descuento
						</th>
						{!isVoluntaria && (
							<>
								<th className="py-3 px-4 text-sm font-semibold text-foreground" scope="col">
									% Clawback
								</th>
								<th className="py-3 px-4 text-sm font-semibold text-foreground" scope="col">
									Es Clawback
								</th>
							</>
						)}
						<th className="py-3 px-4 text-sm font-semibold text-foreground" scope="col">
							Rezagado
						</th>
						<th className="py-3 px-4 text-sm font-semibold text-foreground" scope="col">
							Fecha Sincronización
						</th>
						{!isVoluntaria && (
							<th className="py-3 px-4 text-sm font-semibold text-foreground" scope="col">
								Fecha Rezagado
							</th>
						)}
						{isVoluntaria && (
							<>
								<th className="py-3 px-4 text-sm font-semibold text-foreground" scope="col">
									Fecha Inicio
								</th>
								<th className="py-3 px-4 text-sm font-semibold text-foreground" scope="col">
									Fecha Fin
								</th>
							</>
						)}
						<th className="py-3 px-4 text-sm font-semibold text-foreground text-right" scope="col">
							Acciones
						</th>
					</tr>
				</thead>
				<tbody>
					{registros.map((r) => (
						<tr
							key={r.idSettlementCommission}
							className="border-b border-border hover:bg-muted/50 transition-colors duration-150"
						>
							<td className="py-3 px-4 text-center">
								<input
									type="checkbox"
									checked={selectedIds.has(r.idSettlementCommission)}
									onChange={() => toggleOne(r.idSettlementCommission)}
									aria-label={`Seleccionar registro ${r.idSettlementCommission}`}
									className="cursor-pointer rounded border-border"
								/>
							</td>
							<td className="py-3 px-4 text-sm text-foreground">
								{r.contrato ?? '—'}
							</td>
							<td className="py-3 px-4 text-sm text-foreground">
								{r.nombreAsesor}
							</td>
							<td className="py-3 px-4 text-sm text-foreground">
								{formatNumber(r.monto)}
							</td>
							<td className="py-3 px-4 text-sm text-foreground">
								{formatNumber(r.baseComision)}
							</td>
							<td className="py-3 px-4 text-sm text-muted-foreground">
								{formatPct(r.porcentajeDescuento)}
							</td>
							{!isVoluntaria && (
								<>
									<td className="py-3 px-4 text-sm text-muted-foreground">
										{formatPct(r.porcentajeClawback)}
									</td>
									<td className="py-3 px-4 text-sm text-muted-foreground">
										{r.esClawback ? 'Sí' : 'No'}
									</td>
								</>
							)}
							<td className="py-3 px-4 text-sm text-muted-foreground">
								{r.esRezagado ? 'Sí' : 'No'}
							</td>
							<td className="py-3 px-4 text-sm text-muted-foreground">
								{r.fechaSincronizacion
									? r.fechaSincronizacion.split('T')[0]
									: '—'}
							</td>
							{!isVoluntaria && (
								<td className="py-3 px-4 text-sm text-muted-foreground">
									{r.fechaRezagado ? r.fechaRezagado.split('T')[0] : '—'}
								</td>
							)}
							{isVoluntaria && (
								<>
									<td className="py-3 px-4 text-sm text-muted-foreground">
										{r.fechaInicio ?? '—'}
									</td>
									<td className="py-3 px-4 text-sm text-muted-foreground">
										{r.fechaFin ?? '—'}
									</td>
								</>
							)}
							<td className="py-3 px-4 text-right">
								<div className="flex items-center justify-end gap-2">
									{r.idBusiness != null ? (
										<Button
											variant="outline"
											size="sm"
											onClick={() => onVerNegocio(r.idBusiness!)}
											className="cursor-pointer"
											aria-label="Ver negocio"
										>
											Ver negocio
										</Button>
									) : (
										<span className="text-muted-foreground text-sm">—</span>
									)}
									<Button
										variant="outline"
										size="sm"
										onClick={() => onVerDistribucion(r.idSettlementCommission)}
										className="cursor-pointer"
										aria-label="Ver distribución de comisión"
									>
										Detalle de Distribución
									</Button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
