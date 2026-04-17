'use client'

import { Button } from '@/features/shared/ui/button'
import {
	FileText,
	CheckCircle2,
	Download,
	Upload,
	CircleCheck,
	CircleX,
	CircleOff,
	Clock,
} from 'lucide-react'
import { ProcessResult, ProcessedRecord } from '../types/load-file.types'
import {
	generateErrorReportCSV,
	downloadCSV,
} from '../lib/generate-error-report'

interface ProcessingSummaryProps {
	result: ProcessResult & {
		sincronizadoCount: number
		rezagadoCount: number
	}
	fileName: string
	onUploadAnother: () => void
}

export function ProcessingSummary({
	result,
	fileName,
	onUploadAnother,
}: ProcessingSummaryProps) {
	const handleDownloadErrorReport = () => {
		if (result.errorRecords.length === 0) return

		const csvContent = generateErrorReportCSV(
			result.errorRecords,
			result.headers
		)
		const timestamp = new Date().toISOString().split('T')[0]
		const reportFileName = `errores_${fileName.replace(/\.[^/.]+$/, '')}_${timestamp}.csv`
		downloadCSV(csvContent, reportFileName)
	}

	// Usar los valores reales del procesamiento
	const sincronizados = result.sincronizadoCount || 0
	const rezagados = result.rezagadoCount || 0
	// No sincronizados = total de registros válidos que no están sincronizados ni son rezagados
	const noSincronizados = Math.max(
		0,
		result.successCount - sincronizados - rezagados
	)

	return (
		<div className="space-y-6">
			{/* Sección de confirmación de carga */}
			<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h3 className="text-lg font-semibold text-primary mb-2">
							Archivo cargado correctamente
						</h3>
						<p className="text-sm text-muted-foreground mb-4">
							Por favor carga los archivos en formato csv, xml con el formato
							correspondiente
						</p>
						<div className="flex items-center gap-3">
							<FileText className="h-5 w-5 text-muted-foreground" />
							<span className="text-sm font-medium text-foreground">
								{fileName}
							</span>
							<CheckCircle2 className="h-5 w-5 text-success" />
						</div>
					</div>
				</div>
			</div>

			{/* Estadísticas en cards */}
			<div className="bg-card rounded-lg border border-border p-4 shadow-sm">
				<h3 className="text-sm font-semibold text-primary mb-1">
					Resumen de esta sincronización
				</h3>
				<p className="text-xs text-muted-foreground">
					Los contadores corresponden únicamente a la sincronización de este archivo.
				</p>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Sincronizados */}
				<div className="rounded-xl bg-emerald-500 p-5 shadow-lg shadow-emerald-500/20 transition-transform hover:scale-[1.02]">
					<div className="flex items-center justify-between mb-3">
						<div className="rounded-lg bg-white/20 p-2">
							<CircleCheck className="h-6 w-6 text-white" />
						</div>
						<span className="text-4xl font-extrabold text-white">
							{sincronizados}
						</span>
					</div>
					<p className="text-sm font-medium text-white/90">
						Sincronizados
					</p>
				</div>

				{/* Errores */}
				<div className="rounded-xl bg-red-500 p-5 shadow-lg shadow-red-500/20 transition-transform hover:scale-[1.02]">
					<div className="flex items-center justify-between mb-3">
						<div className="rounded-lg bg-white/20 p-2">
							<CircleX className="h-6 w-6 text-white" />
						</div>
						<span className="text-4xl font-extrabold text-white">
							{result.errorCount}
						</span>
					</div>
					<p className="text-sm font-medium text-white/90">
						Errores
					</p>
				</div>

				{/* No sincronizados */}
				<div className="rounded-xl bg-blue-500 p-5 shadow-lg shadow-blue-500/20 transition-transform hover:scale-[1.02]">
					<div className="flex items-center justify-between mb-3">
						<div className="rounded-lg bg-white/20 p-2">
							<CircleOff className="h-6 w-6 text-white" />
						</div>
						<span className="text-4xl font-extrabold text-white">
							{noSincronizados}
						</span>
					</div>
					<p className="text-sm font-medium text-white/90">
						No sincronizados
					</p>
				</div>

				{/* Rezagados */}
				<div className="rounded-xl bg-amber-500 p-5 shadow-lg shadow-amber-500/20 transition-transform hover:scale-[1.02]">
					<div className="flex items-center justify-between mb-3">
						<div className="rounded-lg bg-white/20 p-2">
							<Clock className="h-6 w-6 text-white" />
						</div>
						<span className="text-4xl font-extrabold text-white">
							{rezagados}
						</span>
					</div>
					<p className="text-sm font-medium text-white/90">
						Rezagados
					</p>
				</div>
			</div>

			{/* Sección de errores */}
			{result.errorCount > 0 && (
				<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-primary">Errores</h3>
						<Button
							onClick={handleDownloadErrorReport}
							className="bg-primary hover:bg-primary/90 text-primary-foreground"
							size="sm"
						>
							<Download className="h-4 w-4 mr-2" />
							Descargar
						</Button>
					</div>

					{/* Lista de errores */}
					<div className="space-y-3">
						{result.errorRecords.map(
							(errorRecord: ProcessedRecord, index: number) => {
								// Obtener valores relevantes del registro
								const nombre = String(
									errorRecord.data['Nombre'] || errorRecord.data['nombre'] || ''
								)
								const desde = String(
									errorRecord.data['Desde'] || errorRecord.data['desde'] || ''
								)
								const hasta = String(
									errorRecord.data['Hasta'] || errorRecord.data['hasta'] || ''
								)

								// Formatear fechas si es posible
								const formatDate = (value: unknown): string => {
									if (!value) return ''
									if (value instanceof Date) {
										return value.toLocaleDateString('es-ES', {
											year: 'numeric',
											month: 'short',
											day: 'numeric',
										})
									}

									const str = String(value).trim()
									// Limpiar caracteres no imprimibles
									const cleanStr = str.replace(/[\u200B-\u200D\uFEFF]/g, '')

									// Manejar formato DD/MM/YYYY que new Date() suele fallar
									const dmyMatch = cleanStr.match(
										/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
									)
									if (dmyMatch) {
										const [, day, month, year] = dmyMatch
										const date = new Date(
											parseInt(year),
											parseInt(month) - 1,
											parseInt(day)
										)
										if (!isNaN(date.getTime())) {
											return date.toLocaleDateString('es-ES', {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
											})
										}
									}

									// Intentar parsear como fecha estándar (ISO, etc)
									const date = new Date(cleanStr)
									if (!isNaN(date.getTime())) {
										return date.toLocaleDateString('es-ES', {
											year: 'numeric',
											month: 'short',
											day: 'numeric',
										})
									}
									return str
								}

								// Calcular duración si hay fechas
								const desdeDate = desde ? new Date(String(desde)) : null
								const hastaDate = hasta ? new Date(String(hasta)) : null
								let duration = ''
								if (
									desdeDate &&
									hastaDate &&
									!isNaN(desdeDate.getTime()) &&
									!isNaN(hastaDate.getTime())
								) {
									const diffTime = Math.abs(
										hastaDate.getTime() - desdeDate.getTime()
									)
									const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
									duration = `${diffDays} día${diffDays !== 1 ? 's' : ''}`
								}

								return (
									<div
										key={index}
										className="border border-border rounded-lg p-4 hover:bg-muted transition-colors"
									>
										<div className="flex items-start justify-between gap-4">
											<div className="flex-1">
												{/* Información del registro */}
												<div className="flex items-center gap-2 mb-3">
													<div className="h-2 w-2 rounded-full bg-red-500"></div>
													<span className="text-sm font-medium text-foreground">
														{nombre || `Fila ${errorRecord.rowNumber}`}
													</span>
												</div>

												{/* Información de fechas y duración */}
												{(desde || hasta || duration) && (
													<div className="text-sm text-muted-foreground space-y-1 mb-3">
														{duration && (
															<div>
																<span className="font-medium">Duración:</span>{' '}
																{duration}
															</div>
														)}
														{desde && (
															<div>
																<span className="font-medium">Día inicio:</span>{' '}
																{formatDate(desde)}
															</div>
														)}
														{hasta && (
															<div>
																<span className="font-medium">Día fin:</span>{' '}
																{formatDate(hasta)}
															</div>
														)}
													</div>
												)}

												{/* Detalle del error */}
												{errorRecord.errors.length > 0 && (
													<div className="mt-3 pt-3 border-t border-border">
														<p className="text-sm text-destructive font-medium mb-1">
															Detalle del error:
														</p>
														<p className="text-sm text-destructive">
															{errorRecord.errors.join('; ')}
														</p>
													</div>
												)}
											</div>

											{/* Badge de error */}
											<div className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-medium whitespace-nowrap">
												Error
											</div>
										</div>
									</div>
								)
							}
						)}
					</div>
				</div>
			)}

			{/* Botón para subir otro archivo */}
			<div className="flex justify-center pt-6 mr-2">
				<Button
					onClick={onUploadAnother}
					className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
					size="lg"
				>
					<Upload className="h-5 w-5 mr-2" />
					Subir otro nuevo y volver al estado inicial
				</Button>
			</div>
		</div>
	)
}
