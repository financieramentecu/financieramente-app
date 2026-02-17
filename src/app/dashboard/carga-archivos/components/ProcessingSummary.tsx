'use client'

import { Button } from '@/features/shared/ui/button'
import { FileText, CheckCircle2, Download, Upload, AlertTriangle } from 'lucide-react'
import { PreLiquidationResultResponse } from '@/features/pre-liquidacion/types/api-types'

interface ProcessingSummaryProps {
	result: PreLiquidationResultResponse['summary']
	fileName: string
	onUploadAnother: () => void
}

export function ProcessingSummary({
	result,
	fileName,
	onUploadAnother,
}: ProcessingSummaryProps) {
	if (!result) return null

	const handleDownloadErrorReport = () => {
		// Implement basic CSV download for errors
		if (!result.errors || result.errors.length === 0) return

		const headers = ['Fila', 'Motivo']
		const rows = result.errors.map(e => [e.rowIndex, e.reason])
		const csvContent = [
			headers.join(','),
			...rows.map(r => r.join(','))
		].join('\n')

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
		const link = document.createElement('a')
		if (link.download !== undefined) {
			const url = URL.createObjectURL(blob)
			link.setAttribute('href', url)
			link.setAttribute('download', `errores_${fileName}.csv`)
			link.style.visibility = 'hidden'
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
		}
	}

	const sincronizados = result.successfulRows
	const rezagados = 0 // Future: Distinguish logic
	const errores = result.failedRows

	return (
		<div className="space-y-6">
			{/* Sección de confirmación de carga */}
			<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h3 className="text-lg font-semibold text-primary mb-2">
							Procesamiento Completado
						</h3>
						<div className="flex items-center gap-3">
							<FileText className="h-5 w-5 text-muted-foreground" />
							<span className="text-sm font-medium text-foreground">{fileName}</span>
							<CheckCircle2 className="h-5 w-5 text-success" />
						</div>
					</div>
				</div>
			</div>

			{/* Estadísticas en cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Procesados Total */}
				<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
					<div className="flex items-center justify-center mb-3">
						<div className="h-24 w-24 rounded-full bg-transparent border-2 border-primary flex items-center justify-center">
							<span className="text-3xl font-bold text-primary">{result.totalProcessed}</span>
						</div>
					</div>
					<p className="text-center text-sm font-medium text-muted-foreground">Total Procesados</p>
				</div>

				{/* Exitosos */}
				<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
					<div className="flex items-center justify-center mb-3">
						<div className="h-24 w-24 rounded-full bg-transparent border-2 border-success flex items-center justify-center">
							<span className="text-3xl font-bold text-success">{sincronizados}</span>
						</div>
					</div>
					<p className="text-center text-sm font-medium text-muted-foreground">Exitosos</p>
				</div>

				{/* Errores */}
				<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
					<div className="flex items-center justify-center mb-3">
						<div className="h-24 w-24 rounded-full bg-transparent border-2 border-destructive flex items-center justify-center">
							<span className="text-3xl font-bold text-destructive">{errores}</span>
						</div>
					</div>
					<p className="text-center text-sm font-medium text-muted-foreground">Fallidos</p>
				</div>

				{/* Totales Monetarios */}
				<div className="bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col justify-center">
					<div className="text-center mb-2">
						<p className="text-xs text-muted-foreground">Comisión Bruta</p>
						<p className="text-lg font-bold text-foreground">
							{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(result.totalCommissionBruta)}
						</p>
					</div>
					<div className="text-center">
						<p className="text-xs text-muted-foreground">Clawback Retenido</p>
						<p className="text-lg font-bold text-destructive">
							{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(result.totalClawbackRetained)}
						</p>
					</div>
				</div>
			</div>

			{/* Sección de errores */}
			{result.errors && result.errors.length > 0 && (
				<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-primary">Detalle de Errores</h3>
						<Button
							onClick={handleDownloadErrorReport}
							className="bg-primary hover:bg-primary/90 text-primary-foreground"
							size="sm"
						>
							<Download className="h-4 w-4 mr-2" />
							Descargar CSV
						</Button>
					</div>

					{/* Lista de errores */}
					<div className="space-y-3 max-h-96 overflow-y-auto">
						{result.errors.map((error, index) => (
							<div
								key={index}
								className="border border-border rounded-lg p-4 hover:bg-muted transition-colors"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<AlertTriangle className="h-4 w-4 text-destructive" />
											<span className="text-sm font-bold text-foreground">
												Fila {error.rowIndex}
											</span>
										</div>
										<p className="text-sm text-muted-foreground">
											{error.reason}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Botón para subir otro archivo */}
			<div className="flex justify-center pt-6">
				<Button
					onClick={onUploadAnother}
					className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
					size="lg"
				>
					<Upload className="h-5 w-5 mr-2" />
					Subir otro archivo
				</Button>
			</div>
		</div>
	)
}


