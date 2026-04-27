import React, { useMemo } from 'react'
import { ExternalLink, BarChart2 } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { DataTableColumnHeader } from '@/features/shared/ui/DataTable/DataTableColumnHeader'
import type { RegistroLiquidacionDetalle } from '../types/types'
import { formatCurrency, formatPct, formatDate } from '../lib/format-utils'
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table'
import { StatusBadge } from './StatusBadge'

interface RegistrosLiquidacionTableProps {
	registros: RegistroLiquidacionDetalle[]
	fileType: string
	fileName?: string
	selectedIds: Set<number>
	onSelectionChange: (ids: Set<number>) => void
	onVerNegocio: (idBusiness: number) => void
	onVerDistribucion: (idSettlementCommission: number) => void
	selectable?: boolean
	estado?: string
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
	fileName,
	selectable = true,
	estado,
}: RegistrosLiquidacionTableProps) {
	const isVoluntaria = fileType === VOLUNTARIA

	// Adaptador: Convertir Set<number> a Record<string, boolean> para TanStack Table
	const rowSelection = useMemo(() => {
		const selection: Record<string, boolean> = {}
		selectedIds.forEach((id) => {
			selection[id.toString()] = true
		})
		return selection
	}, [selectedIds])

	// Adaptador: Convertir el cambio de selección de TanStack de vuelta al Set<number> del padre
	const handleRowSelectionChange = (updaterOrValue: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
		const newSelection =
			typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection) : updaterOrValue

		const newSet = new Set<number>()
		Object.keys(newSelection).forEach((key) => {
			if (newSelection[key]) {
				newSet.add(parseInt(key, 10))
			}
		})
		onSelectionChange(newSet)
	}

	const columns = useMemo<ColumnDef<RegistroLiquidacionDetalle>[]>(() => {
		const cols: ColumnDef<RegistroLiquidacionDetalle>[] = []

		cols.push(
			{
				accessorKey: 'contrato',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Contrato" />
				),
				cell: ({ row }) => (
					<span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
						{row.original.contrato ?? '—'}
					</span>
				),
			},
			{
				accessorKey: 'nombreCliente',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Cliente" />
				),
				cell: ({ row }) => (
					<span className="text-sm text-foreground truncate max-w-[150px] inline-block">
						{row.original.nombreCliente ?? '—'}
					</span>
				),
			},
			{
				accessorKey: 'nombreAsesor',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Asesor" />
				),
				cell: ({ row }) => (
					<span className="font-medium text-foreground">
						{row.original.nombreAsesor}
					</span>
				),
			},
			{
				accessorKey: 'status',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Estado" className="justify-center" />
				),
				cell: ({ row }) => (
					<div className="flex justify-center">
						<StatusBadge status={row.original.status} />
					</div>
				),
			},
			{
				accessorKey: 'monto',
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title="Comisión"
						className="justify-end"
					/>
				),
				cell: ({ row }) => (
					<div className="text-right font-semibold text-foreground tabular-nums">
						{formatCurrency(row.original.monto)}
					</div>
				),
			},
			{
				accessorKey: 'porcentajeDescuento',
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title="% Desc."
						className="justify-end"
					/>
				),
				cell: ({ row }) => (
					<div className="text-right text-muted-foreground tabular-nums">
						{formatPct(row.original.porcentajeDescuento)}
					</div>
				),
			}
		)

		if (!isVoluntaria) {
			cols.push(
				{
					accessorKey: 'porcentajeClawback',
					header: ({ column }) => (
						<DataTableColumnHeader
							column={column}
							title="% Clawback"
							className="justify-end"
						/>
					),
					cell: ({ row }) => (
						<div className="text-right text-muted-foreground tabular-nums">
							{formatPct(row.original.porcentajeClawback)}
						</div>
					),
				},
				{
					accessorKey: 'esClawback',
					header: ({ column }) => (
						<DataTableColumnHeader
							column={column}
							title="Clawback"
							className="justify-center"
						/>
					),
					cell: ({ row }) => (
						<div className="flex justify-center">
							<BoolBadge value={row.original.esClawback} />
						</div>
					),
				}
			)
		}

		cols.push({
			accessorKey: 'fechaSincronizacion',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="F. Sincronización" />
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground text-xs whitespace-nowrap">
					{formatDate(row.original.fechaSincronizacion)}
				</span>
			),
		})

		if (!isVoluntaria) {
			cols.push({
				accessorKey: 'fechaRezagado',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="F. Rezagado" />
				),
				cell: ({ row }) => (
					<span className="text-muted-foreground text-xs whitespace-nowrap">
						{formatDate(row.original.fechaRezagado)}
					</span>
				),
			})
		}

		if (isVoluntaria) {
			cols.push(
				{
					accessorKey: 'fechaInicio',
					header: ({ column }) => (
						<DataTableColumnHeader column={column} title="Fecha Inicio" />
					),
					cell: ({ row }) => (
						<span className="text-muted-foreground text-xs whitespace-nowrap">
							{row.original.fechaInicio ?? '—'}
						</span>
					),
				},
				{
					accessorKey: 'fechaFin',
					header: ({ column }) => (
						<DataTableColumnHeader column={column} title="Fecha Fin" />
					),
					cell: ({ row }) => (
						<span className="text-muted-foreground text-xs whitespace-nowrap">
							{row.original.fechaFin ?? '—'}
						</span>
					),
				}
			)
		}

		return cols
	}, [isVoluntaria])

	return (
		<DataTable
			columns={columns}
			data={registros}
			getRowId={(row) => row.idSettlementCommission.toString()}
			getRowAriaLabel={(row) => `Seleccionar registro ${row.idSettlementCommission}`}
			enableRowSelection={(row) =>
				selectable &&
				(row.original.status === 'SYNCHRONIZED' ||
					row.original.status === 'PRE-SETTLED')
			}
			selectedRowIds={selectable ? rowSelection : {}}
			onRowSelectionChange={selectable ? handleRowSelectionChange : undefined}
			searchable={true}
			searchPlaceholder="Filtrar por asesor o contrato..."
			exportable={true}
			exportConfig={{
				fileName: fileName ? `pre-liquidacion-${fileName}` : 'pre-liquidacion-registros',
				sheetName: 'Comisiones',
				transformData: (data) =>
					data.map((r) => ({
						'Contrato': r.contrato ?? '—',
						'Asesor': r.nombreAsesor,
						'Comisión': r.monto,
						'% Descuento': r.porcentajeDescuento / 100,
						...(isVoluntaria ? {} : {
							'% Clawback': r.porcentajeClawback / 100,
							'Clawback': r.esClawback ? 'Sí' : 'No',
						}),
						'Rezagado': r.esRezagado ? 'Sí' : 'No',
						'F. Sincronización': formatDate(r.fechaSincronizacion) ?? '—',
						...(isVoluntaria ? {
							'Fecha Inicio': r.fechaInicio ?? '—',
							'Fecha Fin': r.fechaFin ?? '—',
						} : {
							'F. Rezagado': formatDate(r.fechaRezagado) ?? '—',
						}),
					})),
			}}
			actions={(row) => (
				<div className="flex items-center justify-end gap-1.5">
					{row.idBusiness != null && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onVerNegocio(row.idBusiness!)}
							className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
						>
							<ExternalLink className="h-3 w-3 mr-1" />
							Negocio
						</Button>
					)}
					{estado !== 'LOAD' && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onVerDistribucion(row.idSettlementCommission)}
							className="h-7 px-2 text-xs"
						>
							<BarChart2 className="h-3 w-3 mr-1" />
							Distribución
						</Button>
					)}
				</div>
			)}
		/>
	)
}
