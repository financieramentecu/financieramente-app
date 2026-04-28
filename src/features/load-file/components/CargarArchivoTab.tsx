'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/features/shared/ui/button'
import { AlertModal } from '@/features/shared/ui/modal'
import { FileUp, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateExcelStructure } from '../lib/validate-excel-structure'
import { processExcelFile } from '../lib/process-excel-file'
import { FILE_TYPES, type FileType } from '../lib/file-types'
import { getDefaultPeriod } from '../lib/period-utils'
import { ProcessingProgress } from './ProcessingProgress'
import { RecordsByStatusView } from './RecordsByStatusView'
import { loadFileApi } from '../lib/load-file-api'
import type { ProcessResult } from '../types/load-file.types'

const SPANISH_MONTH_NAMES: Readonly<Record<number, string>> = {
	1: 'Enero',
	2: 'Febrero',
	3: 'Marzo',
	4: 'Abril',
	5: 'Mayo',
	6: 'Junio',
	7: 'Julio',
	8: 'Agosto',
	9: 'Septiembre',
	10: 'Octubre',
	11: 'Noviembre',
	12: 'Diciembre',
} as const

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ACCEPTED_FILE_TYPES = [
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
	'application/vnd.ms-excel', // .xls
	'text/csv', // .csv
]
const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

export function CargarArchivoTab() {
	const router = useRouter()
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [selectedFileType, setSelectedFileType] = useState<FileType | ''>('')
	const [selectedMonth, setSelectedMonth] = useState<number>(() => getDefaultPeriod().month)
	const [selectedYear, setSelectedYear] = useState<number>(() => getDefaultPeriod().year)
	const [isDragging, setIsDragging] = useState(false)
	const [isUploading, setIsUploading] = useState(false)
	const [errorModalOpen, setErrorModalOpen] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')
	const [errorModalTitle, setErrorModalTitle] = useState<string | undefined>(
		undefined
	)
	const [processingResult, setProcessingResult] = useState<
		| (ProcessResult & {
			sincronizadoCount: number
			rezagadoCount: number
			noSincronizadoCount?: number
		})
		| null
	>(null)
	const [processingProgress, setProcessingProgress] = useState<{
		current: number
		total: number
		sincronizado: number
		rezagado: number
		error: number
	} | null>(null)
	const [currentFileImportId, setCurrentFileImportId] = useState<
		number | null
	>(null)
	const [currentLoadNumber, setCurrentLoadNumber] = useState<number | null>(null)

	const fileInputRef = useRef<HTMLInputElement>(null)
	// Refs para control de cancelación
	const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
	const abortControllerRef = useRef<AbortController | null>(null)

	// Limpiar intervalos y abortar peticiones al desmontar
	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current)
			}
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}
	}, [])

	const handleCancelUpload = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
			abortControllerRef.current = null
		}
		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current)
			pollIntervalRef.current = null
		}
		setIsUploading(false)
		setProcessingProgress(null)
		setErrorMessage('Carga cancelada por el usuario')
		setErrorModalTitle('Carga Cancelada')
		setErrorModalOpen(true)
	}

	// Función para validar el formato del archivo
	const validateFileFormat = (
		file: File
	): { isValid: boolean; error?: string } => {
		// Validar por extensión de archivo
		const fileName = file.name.toLowerCase()
		const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) =>
			fileName.endsWith(ext)
		)

		// Validar por tipo MIME
		const hasValidMimeType = ACCEPTED_FILE_TYPES.includes(file.type)

		// El archivo es válido si tiene una extensión válida O un tipo MIME válido
		// (algunos navegadores no siempre detectan correctamente el tipo MIME)
		if (!hasValidExtension && !hasValidMimeType) {
			return {
				isValid: false,
				error:
					'Formato de archivo no válido. Solo se permiten archivos .xlsx, .xls o .csv',
			}
		}

		return { isValid: true }
	}

	const handleFileSelect = (file: File) => {
		// Validar formato de archivo
		const formatValidation = validateFileFormat(file)
		if (!formatValidation.isValid) {
			setErrorMessage(formatValidation.error || 'Formato de archivo no válido')
			setErrorModalTitle(undefined)
			setErrorModalOpen(true)
			return
		}

		// Validar tamaño
		if (file.size > MAX_FILE_SIZE) {
			setErrorMessage(
				'El archivo es demasiado grande. El tamaño máximo es 50MB'
			)
			setErrorModalTitle(undefined)
			setErrorModalOpen(true)
			return
		}

		setSelectedFile(file)
	}

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(true)
	}

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(false)
	}

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(false)

		const files = Array.from(e.dataTransfer.files)
		if (files.length > 0) {
			handleFileSelect(files[0])
		}
	}

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (files && files.length > 0) {
			handleFileSelect(files[0])
		}
	}

	const handleSelectFile = () => {
		fileInputRef.current?.click()
	}

	const handleClear = () => {
		setSelectedFile(null)
		setProcessingResult(null)
		setProcessingProgress(null)
		setCurrentFileImportId(null)
		setCurrentLoadNumber(null)
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}

	const handleUploadAnother = () => {
		handleClear()
	}

	const handleUpload = async () => {
		if (!selectedFile) return
		if (!selectedFileType) {
			setErrorMessage('Debes seleccionar el tipo de archivo antes de cargar.')
			setErrorModalTitle('TIPO DE ARCHIVO REQUERIDO')
			setErrorModalOpen(true)
			return
		}

		// Validar formato del archivo antes de cargar
		const formatValidation = validateFileFormat(selectedFile)
		if (!formatValidation.isValid) {
			setErrorMessage(
				formatValidation.error ||
				'Formato de archivo no válido. Solo se permiten archivos .xlsx, .xls o .csv'
			)
			setErrorModalTitle(undefined)
			setErrorModalOpen(true)
			return
		}

		// Validar tamaño antes de cargar
		if (selectedFile.size > MAX_FILE_SIZE) {
			setErrorMessage(
				'El archivo es demasiado grande. El tamaño máximo es 50MB'
			)
			setErrorModalTitle(undefined)
			setErrorModalOpen(true)
			return
		}

		// Validar estructura del archivo Excel
		setIsUploading(true)
		abortControllerRef.current = new AbortController()

		try {
			const structureValidation = await validateExcelStructure(
				selectedFile,
				selectedFileType
			)

			if (!structureValidation.isValid) {
				// Mostrar modal con el mensaje exacto según el diseño
				setErrorMessage(
					'El archivo no contiene la estructura esperada de Skandia. Verifique las columnas requeridas.'
				)
				setErrorModalTitle('ESTRUCTURA INCORRECTA')
				setErrorModalOpen(true)
				setIsUploading(false)
				return
			}

			// Si la validación es exitosa, procesar el archivo
			const result = await processExcelFile(selectedFile, selectedFileType)

			// Verificar cancelación antes de continuar
			if (abortControllerRef.current?.signal.aborted) return

			// Crear FileImport
			const initiateResponse = await loadFileApi.initiateImport(
				selectedFileType,
				selectedMonth,
				selectedYear,
				{ signal: abortControllerRef.current?.signal }
			)

			if (!initiateResponse.data) {
				const errorMsg = initiateResponse.error || 'Error al crear registro de importación'
				
				// Mejorar mensaje para períodos bloqueados
				if (errorMsg === 'Período en pre-liquidación') {
					setErrorMessage(
						'No se pueden cargar nuevos archivos porque ya existe un proceso de pre-liquidación en curso para este período. Los datos están congelados para asegurar la consistencia del cálculo.'
					)
				} else if (errorMsg.includes('ya fue liquidado')) {
					setErrorMessage(
						'Este período ya ha sido finalizado y liquidado. No se permite la carga de nuevos datos.'
					)
				} else {
					setErrorMessage(errorMsg)
				}

				setErrorModalTitle('PERÍODO BLOQUEADO')
				setErrorModalOpen(true)
				setIsUploading(false)
				return
			}

			const fileImport = initiateResponse.data.fileImport
			setCurrentFileImportId(fileImport.idFileImport)
			setCurrentLoadNumber(fileImport.uploadCount)

			// Procesar y guardar todos los registros (incluyendo los que tienen error previo)
			const allRecords = [...result.validRecords, ...result.errorRecords]

			if (allRecords.length > 0) {
				// SESSION RESET POINT: counters start at zero for this sync session
				setProcessingProgress({
					current: 0,
					total: allRecords.length,
					sincronizado: 0,
					rezagado: 0,
					error: 0,
				})

				// Función para hacer polling del progreso
				const pollProgress = (fileImportId: number): void => {
					pollIntervalRef.current = setInterval(async () => {
						try {
							const progressResponse = await loadFileApi.getImportProgress(
								fileImportId,
								{},
								{ signal: abortControllerRef.current?.signal }
							)

							if (!('error' in progressResponse) && progressResponse.data) {
								const fileImportData = progressResponse.data

								// Polling only detects terminal status — counters are accumulated from batch responses
								if (
									fileImportData.status === 'COMPLETED' ||
									fileImportData.status === 'CANCELADO' ||
									fileImportData.status === 'LOAD' ||
									fileImportData.status === 'ERROR'
								) {
									if (pollIntervalRef.current) {
										clearInterval(pollIntervalRef.current)
										pollIntervalRef.current = null
									}
								}
							}
						} catch (error) {
							console.error('Error al obtener progreso:', error)
						}
					}, 1000) // Polling cada 1s

					// Limpiar intervalo después de 5 minutos como seguridad
					setTimeout(
						() => {
							if (pollIntervalRef.current) {
								clearInterval(pollIntervalRef.current)
								pollIntervalRef.current = null
							}
						},
						5 * 60 * 1000
					)
				}

				// Iniciar polling
				pollProgress(fileImport.idFileImport)

				// Procesar por lotes (chunks) para permitir cancelación real
				const BATCH_SIZE = 50
				const totalRecordsCount = allRecords.length
				let processedCount = 0
				let sessionSincronizado = 0
				let sessionRezagado = 0
				let sessionError = 0
				let sessionNoSincronizado = 0

				for (let i = 0; i < totalRecordsCount; i += BATCH_SIZE) {
					// Verificar si se canceló
					if (abortControllerRef.current?.signal.aborted) {
						break
					}

					const recordsBatch = allRecords.slice(i, i + BATCH_SIZE)

					// Llamar a la API para procesar este lote
					const processResponse = await loadFileApi.processBatch(
						{
							fileImportId: fileImport.idFileImport,
							records: recordsBatch,
							headers: result.headers,
							batchSize: BATCH_SIZE,
							fileType: selectedFileType,
						},
						{ signal: abortControllerRef.current?.signal }
					)

					if ('error' in processResponse) {
						throw new Error(
							`Error al procesar lote ${i} - ${i + BATCH_SIZE}: ${processResponse.error}`
						)
					}

					const batchSummary = processResponse.data.summary
					processedCount += recordsBatch.length

					// Accumulate session counters from batch response (not from DB polling)
					sessionSincronizado += batchSummary.sincronizado ?? 0
					sessionRezagado += batchSummary.rezagado ?? 0
					sessionError += batchSummary.error ?? 0
					sessionNoSincronizado += batchSummary.noSincronizado ?? 0

					setProcessingProgress((prev) =>
						prev
							? {
								...prev,
								current: processedCount,
								sincronizado: sessionSincronizado,
								rezagado: sessionRezagado,
								error: sessionError,
							}
							: null
					)
				}

				// Limpiar progreso para mostrar el resumen con contadores de sesión
				setProcessingProgress(null)

				// Usar contadores de sesión (no los acumulados en DB)
				setProcessingResult({
					...result,
					sincronizadoCount: sessionSincronizado,
					rezagadoCount: sessionRezagado,
					noSincronizadoCount: sessionNoSincronizado,
					errorCount: sessionError || result.errorCount,
					uploadCount: fileImport.uploadCount,
				})
			} else {
				// Si no hay registros válidos, solo mostrar errores
				setProcessingResult({
					...result,
					sincronizadoCount: 0,
					rezagadoCount: 0,
					noSincronizadoCount: 0,
				})
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				console.log('Carga cancelada')
				return
			}
			console.error('Error al procesar archivo:', error)
			setErrorMessage(
				'Error al procesar el archivo. Por favor, intenta nuevamente.'
			)
			setErrorModalTitle(undefined)
			setErrorModalOpen(true)
		} finally {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current)
				pollIntervalRef.current = null
			}
			// Only set uploading to false if we are not cancelling with a specific modal flow?
			// Actually handleCancelUpload sets it to false.
			// But if we return early due to abort, we might skip this.
			// Wait, if error is AbortError, I return early in catch block.
			// Ideally I should let it flow to finally or ensure setIsUploading(false) is called.
			setIsUploading(false)
			abortControllerRef.current = null
		}
	}

	const handleFileTypeChange = (
		event: React.ChangeEvent<HTMLSelectElement>
	) => {
		const value = event.target.value as FileType | ''
		setSelectedFileType(value)
	}

	const formatFileSize = (bytes: number): string => {
		if (bytes < 1024) return bytes + ' B'
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
		return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
	}

	return (
		<div className="space-y-6">
			{/* Modal de error */}
			<AlertModal
				open={errorModalOpen}
				onOpenChange={setErrorModalOpen}
				type="error"
				title={errorModalTitle}
				message={
					errorMessage ||
					'Formato de archivo no válido. Solo se permiten archivos .xlsx, .xls o .csv'
				}
				confirmText={errorModalTitle ? 'ACEPTAR' : 'Aceptar'}
				onConfirm={() => {
					setErrorModalOpen(false)
					setErrorModalTitle(undefined)
				}}
			/>

			{/* Mostrar progreso si está procesando */}
			{processingProgress && (
				<div className="space-y-4">
					<ProcessingProgress
						current={processingProgress.current}
						total={processingProgress.total}
						sincronizado={processingProgress.sincronizado}
						rezagado={processingProgress.rezagado}
						error={processingProgress.error}
						onCancel={handleCancelUpload}
						loadNumber={currentLoadNumber ?? undefined}
					/>
				</div>
			)}

			{/* Mostrar vista por estado (cards + tabs) si hay resultado */}
			{processingResult && !processingProgress && currentFileImportId ? (
				<div className="space-y-6">
					<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
						<h3 className="text-lg font-semibold text-primary mb-2">
							Archivo cargado correctamente
						</h3>
						<p className="text-sm text-muted-foreground">
							{selectedFile?.name || 'archivo'}
						</p>
					</div>
					<RecordsByStatusView
						fileImportId={currentFileImportId}
						counts={{
							sincronizados: processingResult.sincronizadoCount ?? 0,
							errores: processingResult.errorCount ?? 0,
							noSincronizados:
								processingResult.noSincronizadoCount ??
								Math.max(
									0,
									(processingResult.successCount ?? 0) -
									(processingResult.sincronizadoCount ?? 0) -
									(processingResult.rezagadoCount ?? 0)
								),
							rezagados: processingResult.rezagadoCount ?? 0,
						}}
						uploadCount={processingResult.uploadCount}
						loadNumber={currentLoadNumber ?? undefined}
					/>
					<div className="flex justify-center pt-4 gap-4">
						<Button
							onClick={handleUploadAnother}
							variant="outline"
							className="px-8"
							size="lg"
						>
							<FileUp className="h-5 w-5 mr-2" />
							Subir otro
						</Button>
						{((processingResult.sincronizadoCount ?? 0) > 0 ||
							(processingResult.rezagadoCount ?? 0) > 0) && (
								<Button
									onClick={() => router.push(`/dashboard/pre-liquidacion/${currentFileImportId}`)}
									className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
									size="lg"
								>
									<ArrowRight className="h-5 w-5 mr-2" />
									Ir a preliquidar
								</Button>
							)}
					</div>
				</div>
			) : !processingProgress ? (
				<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
					<h2 className="text-xl font-semibold text-primary mb-4">
						Cargar Archivo de Covers Skandia
					</h2>
					<p className="text-muted-foreground mb-6">
						Arrastra y suelta tu archivo Excel de Skandia o haz clic para
						seleccionar
					</p>

					<div className="mb-6 space-y-2">
						<label className="text-sm font-medium text-foreground">
							Tipo de archivo
						</label>
						<select
							value={selectedFileType}
							onChange={handleFileTypeChange}
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
						>
							<option value="">Selecciona el tipo</option>
							<option value={FILE_TYPES.POLIZA}>POLIZA</option>
							<option value={FILE_TYPES.VOLUNTARIA}>VOLUNTARIA</option>
						</select>
					</div>

					{/* Selector de período */}
					<div className="mb-6 grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground">
								Mes
							</label>
							<select
								value={selectedMonth}
								onChange={(e) => setSelectedMonth(Number(e.target.value))}
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
							>
								{Object.entries(SPANISH_MONTH_NAMES).map(([num, name]) => (
									<option key={num} value={num}>
										{name}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground">
								Año
							</label>
							<select
								value={selectedYear}
								onChange={(e) => setSelectedYear(Number(e.target.value))}
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
							>
								{Array.from({ length: 11 }, (_, i) => 2020 + i).map((year) => (
									<option key={year} value={year}>
										{year}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Confirmación de período seleccionado */}
					{selectedFileType && (
						<p className="text-sm text-muted-foreground mb-4">
							Sincronizando:{' '}
							<span className="font-medium text-foreground">
								{selectedFileType} / {SPANISH_MONTH_NAMES[selectedMonth]} {selectedYear}
							</span>
						</p>
					)}

					{/* Área de drag and drop */}
					<div
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						className={cn(
							'border-2 border-dashed rounded-lg p-12 text-center transition-colors',
							isDragging
								? 'border-primary bg-secondary/10'
								: 'border-secondary bg-secondary/5',
							selectedFile && 'border-primary bg-secondary/10'
						)}
					>
						{selectedFile ? (
							<div className="space-y-4">
								<FileUp className="h-16 w-16 mx-auto text-primary" />
								<div>
									<p className="text-lg font-semibold text-primary">
										{selectedFile.name}
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										{formatFileSize(selectedFile.size)}
									</p>
								</div>
							</div>
						) : (
							<>
								<FileUp className="h-16 w-16 mx-auto text-primary mb-4" />
								<p className="text-lg font-medium text-primary mb-4">
									Arrastra tu archivo de Skandia aquí
								</p>
								<Button
									onClick={handleSelectFile}
									className="bg-primary hover:bg-primary/90 text-primary-foreground"
								>
									<FileUp className="h-4 w-4" />
									Seleccionar archivo
								</Button>
							</>
						)}

						<input
							ref={fileInputRef}
							type="file"
							accept=".xlsx,.xls,.csv"
							onChange={handleFileInputChange}
							className="hidden"
						/>
					</div>

					{/* Información de formatos */}
					<p className="text-sm text-muted-foreground mt-4 text-center">
						Formatos soportados: xlsx, xls, csv • Tamaño máximo: 50MB
					</p>

					{/* Botones de acción */}
					<div className="flex justify-end gap-4 mt-6">
						<Button
							variant="outline"
							onClick={handleClear}
							disabled={!selectedFile || isUploading}
							className="text-foreground"
						>
							<X className="h-4 w-4" />
							Limpiar
						</Button>
						<Button
							onClick={handleUpload}
							disabled={!selectedFile || !selectedFileType || isUploading}
							className="bg-primary hover:bg-primary/90 text-primary-foreground"
						>
							{isUploading ? 'Cargando...' : 'Cargar'}
						</Button>
					</div>
				</div>
			) : null}

			{/* Sección de Formato Requerido */}
			<div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-3">
				<p className="text-sm text-foreground leading-relaxed">
					<strong>Formato requerido de Skandia:</strong> Seleccione el tipo de
					archivo y use la estructura correspondiente. El sistema validará
					automáticamente las columnas y sincronizará con los registros
					existentes.
				</p>
				<div className="text-sm text-foreground space-y-2">
					<p>
						<strong>Voluntaria:</strong> Nombre Franquicia, Desde, Hasta, Nombre
						Fp, Sub Grupo Fp, Compania, Producto, Tipo de Comision, Cto, Base,
						Com.
					</p>
					<p>
						<strong>Póliza:</strong> Polizas Periodo, Plan de Compensación,
						Valor Comisión, BASE, Polizas Producto, Contrato Largo, Polizas Id
						Agente, Polizas Nombre Agente, Polizas Id Sociedad, Nombre Sociedad,
						Polizas Clasificación.
					</p>
				</div>
			</div>
		</div>
	)
}
