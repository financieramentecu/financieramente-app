'use client'
import React from 'react'
import { FileText, Trash2, Eye, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { FileStatusBadge } from './ui/FileStatusBadge'
import type { CargaHistorial } from '../hooks/use-file-history'

// ---------------------------------------------------------------------------
// StatBadge — internal helper for counters (exitosos, errores, etc.)
// ---------------------------------------------------------------------------

interface StatBadgeProps {
	readonly label: string
	readonly value: number
	readonly bgColor: string
	readonly textColor: string
	readonly borderColor: string
	readonly dotColor: string
}

function StatBadge({
	label,
	value,
	bgColor,
	textColor,
	borderColor,
	dotColor,
}: StatBadgeProps) {
	return (
		<span
			className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
			style={{
				backgroundColor: bgColor,
				color: textColor,
				border: `1px solid ${borderColor}`,
			}}
		>
			<span
				className="w-1.5 h-1.5 rounded-full"
				style={{ backgroundColor: dotColor }}
			/>
			{value} {label}
		</span>
	)
}

// ---------------------------------------------------------------------------
// FileImportCard props
// ---------------------------------------------------------------------------

export interface FileImportCardProps {
	readonly carga: CargaHistorial
	/**
	 * Whether to show the delete button.
	 * The parent decides this — typically `carga.estado === 'LOAD'`.
	 */
	readonly canDelete: boolean
	/**
	 * Whether to show the "Preliquidar" button.
	 * Typically `carga.estado === 'LOAD' && carga.sincronizados > 0 && userCanPreliquidar`.
	 */
	readonly canPreliquidar: boolean
	readonly isPreliquidarLoading: boolean
	readonly onDelete: (id: string) => void
	readonly onPreliquidar: (carga: CargaHistorial) => void
	readonly onViewDetail: (id: number) => void
	readonly onGoToPreliquidacion?: (idFileImport: number) => void
}

// ---------------------------------------------------------------------------
// FileImportCard component
// ---------------------------------------------------------------------------

export function FileImportCard({
	carga,
	canDelete,
	canPreliquidar,
	isPreliquidarLoading,
	onDelete,
	onPreliquidar,
	onViewDetail,
	onGoToPreliquidacion,
}: FileImportCardProps) {
	const isPreSettled = carga.estado === 'PRE-SETTLED'
	const isLoad = carga.estado === 'LOAD'

	return (
		<div className="bg-muted rounded-lg p-4 border border-border">
			<div className="flex items-start justify-between gap-4">
				{/* File information */}
				<div className="flex items-start gap-3 flex-1">
					<FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
					<div className="flex-1">
						{/* Filename and status badge */}
						<div className="flex items-center gap-2 mb-2 flex-wrap">
							<h3 className="font-semibold text-primary">
								{carga.nombreArchivo}
							</h3>
							<FileStatusBadge status={carga.estado as import('./ui/FileStatusBadge').FileImportStatus} />
						</div>

						{/* Date, time and user */}
						<p className="text-sm text-muted-foreground mb-3">
							{carga.fechaCarga}, {carga.horaCarga} • Por: {carga.usuario}
						</p>

						{/* Statistics badges */}
						<div className="flex flex-wrap items-center gap-2">
							<StatBadge
								label="exitosos"
								value={carga.exitosos}
								bgColor="#dcfce7"
								textColor="#166534"
								borderColor="#86efac"
								dotColor="#16a34a"
							/>
							<StatBadge
								label="errores"
								value={carga.errores}
								bgColor="#fee2e2"
								textColor="#991b1b"
								borderColor="#fca5a5"
								dotColor="#dc2626"
							/>
							<StatBadge
								label="sincronizados"
								value={carga.sincronizados}
								bgColor="#dbeafe"
								textColor="#1e40af"
								borderColor="#93c5fd"
								dotColor="#3b82f6"
							/>
							<StatBadge
								label="sin registro"
								value={carga.sinRegistro}
								bgColor="#fef9c3"
								textColor="#854d0e"
								borderColor="#fde047"
								dotColor="#eab308"
							/>
							<StatBadge
								label="rezagados"
								value={carga.rezagados}
								bgColor="#fef3c7"
								textColor="#92400e"
								borderColor="#fcd34d"
								dotColor="#f59e0b"
							/>
						</div>
					</div>
				</div>

				{/* Action buttons */}
				<div className="flex items-center gap-2 shrink-0">
					{/* Ver detalle — only for LOAD */}
					{isLoad && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onViewDetail(parseInt(carga.id, 10))}
							className="p-2 cursor-pointer transition-colors duration-200"
							title="Ver detalle por estado"
						>
							<Eye className="h-4 w-4 mr-1" />
							Ver detalle
						</Button>
					)}

					{/* Ir a Pre-liquidación — only for PRE-SETTLED */}
					{isPreSettled && onGoToPreliquidacion && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onGoToPreliquidacion(carga.idFileImport)}
							className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary cursor-pointer transition-colors duration-200"
						>
							<ArrowRight className="h-4 w-4 mr-1" />
							Ir a Pre-liquidación
						</Button>
					)}

					{/* Preliquidar — only for LOAD with sincronizados > 0 and permission */}
					{canPreliquidar && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPreliquidar(carga)}
							disabled={isPreliquidarLoading}
							className="p-2 cursor-pointer transition-colors duration-200"
							title="Pre-liquidar archivo"
						>
							{isPreliquidarLoading ? (
								<Loader2 className="h-4 w-4 mr-1 animate-spin" />
							) : null}
							Preliquidar
						</Button>
					)}

					{/* Delete — only when canDelete is true */}
					{canDelete && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onDelete(carga.id)}
							className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 cursor-pointer transition-colors duration-200"
							title="Eliminar registro"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>
		</div>
	)
}
