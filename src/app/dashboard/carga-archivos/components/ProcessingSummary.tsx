'use client'

import { Button } from '@/features/shared/ui/button'
import { FileText, CheckCircle2, Download, Upload } from 'lucide-react'
import { ProcessResult } from '../lib/process-excel-file'
import { generateErrorReportCSV, downloadCSV } from '../lib/generate-error-report'

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

		const csvContent = generateErrorReportCSV(result.errorRecords, result.headers)
		const timestamp = new Date().toISOString().split('T')[0]
		const reportFileName = `errores_${fileName.replace(/\.[^/.]+$/, '')}_${timestamp}.csv`
		downloadCSV(csvContent, reportFileName)
	}

	// Usar los valores reales del procesamiento
	const sincronizados = result.sincronizadoCount || 0
	const rezagados = result.rezagadoCount || 0
	// No sincronizados = total de registros válidos que no están sincronizados ni son errores
	// Esto incluye los rezagados y cualquier otro registro que no se pudo sincronizar
	const noSincronizados = result.successCount - sincronizados

	return (
		<div className="space-y-6">
			{/* Sección de confirmación de carga */}
			<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h3 className="text-lg font-semibold text-[#00505C] mb-2">
							Archivo cargado correctamente
						</h3>
						<p className="text-sm text-gray-600 mb-4">
							Por favor carga los archivos en formato csv, xml con el formato correspondiente
						</p>
						<div className="flex items-center gap-3">
							<FileText className="h-5 w-5 text-gray-600" />
							<span className="text-sm font-medium text-gray-800">{fileName}</span>
							<CheckCircle2 className="h-5 w-5 text-green-600" />
						</div>
					</div>
				</div>
			</div>


			{/* Estadísticas en cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Sincronizados */}
				<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
					<div className="flex items-center justify-center mb-3">
						<div className="h-24 w-24 rounded-full bg-transparent border-2 border-green-500 flex items-center justify-center">
							<span className="text-3xl font-bold text-green-600">{sincronizados}</span>
						</div>
					</div>
					<p className="text-center text-sm font-medium text-gray-700">Sincronizados</p>
				</div>

				{/* Errores */}
				<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
					<div className="flex items-center justify-center mb-3">
						<div className="h-24 w-24 rounded-full bg-transparent border-2 border-red-500 flex items-center justify-center">
							<span className="text-3xl font-bold text-red-600">{result.errorCount}</span>
						</div>
					</div>
					<p className="text-center text-sm font-medium text-gray-700">Errores</p>
				</div>

				{/* No sincronizados */}
				<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
					<div className="flex items-center justify-center mb-3">
						<div className="h-24 w-24 rounded-full bg-transparent border-2 border-blue-500 flex items-center justify-center">
							<span className="text-3xl font-bold text-blue-600">{noSincronizados}</span>
						</div>
					</div>
					<p className="text-center text-sm font-medium text-gray-700">No sincronizados</p>
				</div>

				{/* Rezagados */}
				<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
					<div className="flex items-center justify-center mb-3">
						<div className="h-24 w-24 rounded-full bg-transparent border-2 border-yellow-500 flex items-center justify-center">
							<span className="text-3xl font-bold text-yellow-600">{rezagados}</span>
						</div>
					</div>
					<p className="text-center text-sm font-medium text-gray-700">Rezagados</p>
				</div>
			</div>

			{/* Sección de errores */}
			{result.errorCount > 0 && (
				<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-[#00505C]">Errores</h3>
						<Button
							onClick={handleDownloadErrorReport}
							className="bg-[#00505C] hover:bg-[#003c45] text-white"
							size="sm"
						>
							<Download className="h-4 w-4 mr-2" />
							Descargar
						</Button>
					</div>

					{/* Lista de errores */}
					<div className="space-y-3">
						{result.errorRecords.map((errorRecord, index) => {
							// Obtener valores relevantes del registro
							const nombre = String(errorRecord.data['Nombre'] || errorRecord.data['nombre'] || '')
							const desde = String(errorRecord.data['Desde'] || errorRecord.data['desde'] || '')
							const hasta = String(errorRecord.data['Hasta'] || errorRecord.data['hasta'] || '')

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
								const str = String(value)
								// Intentar parsear como fecha
								const date = new Date(str)
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
							if (desdeDate && hastaDate && !isNaN(desdeDate.getTime()) && !isNaN(hastaDate.getTime())) {
								const diffTime = Math.abs(hastaDate.getTime() - desdeDate.getTime())
								const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
								duration = `${diffDays} día${diffDays !== 1 ? 's' : ''}`
							}

							return (
								<div
									key={index}
									className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
								>
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1">
											{/* Información del registro */}
											<div className="flex items-center gap-2 mb-3">
												<div className="h-2 w-2 rounded-full bg-red-500"></div>
												<span className="text-sm font-medium text-gray-800">
													{nombre || `Fila ${errorRecord.rowNumber}`}
												</span>
											</div>

											{/* Información de fechas y duración */}
											{(desde || hasta || duration) && (
												<div className="text-sm text-gray-600 space-y-1 mb-3">
													{duration && (
														<div>
															<span className="font-medium">Duración:</span> {duration}
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
												<div className="mt-3 pt-3 border-t border-gray-200">
													<p className="text-sm text-red-600 font-medium mb-1">
														Detalle del error:
													</p>
													<p className="text-sm text-red-600">
														{errorRecord.errors.join('; ')}
													</p>
												</div>
											)}
										</div>

										{/* Badge de error */}
										<div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium whitespace-nowrap">
											Error
										</div>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			)}

			{/* Botón para subir otro archivo */}
			<div className="flex justify-center pt-6">
				<Button
					onClick={onUploadAnother}
					className="bg-[#00505C] hover:bg-[#003c45] text-white px-8"
					size="lg"
				>
					<Upload className="h-5 w-5 mr-2" />
					Subir otro nuevo y volver al estado inicial
				</Button>
			</div>
		</div>
	)
}

