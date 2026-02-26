'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/features/shared/ui/button'
import { AlertModal } from '@/features/shared/ui/modal'
import { FileUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateExcelStructure } from '../lib/validate-excel-structure'
import { processExcelFile } from '../lib/process-excel-file'
import { FILE_TYPES, type FileType } from '../lib/file-types'
import { ProcessingSummary } from './ProcessingSummary'
import { ProcessingProgress } from './ProcessingProgress'
import { loadFileApi } from '../lib/load-file-api'
import type { ProcessResult } from '../types/load-file.types'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ACCEPTED_FILE_TYPES = [
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
	'application/vnd.ms-excel', // .xls
	'text/csv', // .csv
]
const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

export function CargarArchivoTab() {
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [selectedFileType, setSelectedFileType] = useState<FileType | ''>('')
	const [isDragging, setIsDragging] = useState(false)
	const [isUploading, setIsUploading] = useState(false)
	const [errorModalOpen, setErrorModalOpen] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')
	const [errorModalTitle, setErrorModalTitle] = useState<string | undefined>(
		undefined
	)
	const [processingResult, setProcessingResult] = useState<
		| (ProcessResult & { sincronizadoCount: number; rezagadoCount: number })
		| null
	>(null)
	const [processingProgress, setProcessingProgress] = useState<{
		current: number
		total: number
		sincronizado: number
		rezagado: number
		error: number
	} | null>(null)

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
				selectedFile.name,
				selectedFileType,
				{ signal: abortControllerRef.current?.signal }
			)

			if ('error' in initiateResponse || !initiateResponse.data) {
				throw new Error(
					initiateResponse.error || 'Error al crear registro de importación'
				)
			}

			const fileImport = initiateResponse.data.fileImport

			// Procesar y guardar todos los registros (incluyendo los que tienen error previo)
			const allRecords = [...result.validRecords, ...result.errorRecords]

			if (allRecords.length > 0) {
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
								{ signal: abortControllerRef.current?.signal }
							)

							if (!('error' in progressResponse) && progressResponse.data) {
								const fileImportData = progressResponse.data
								setProcessingProgress((prev) => {
									if (!prev) return null
									return {
										...prev,
										sincronizado: fileImportData.sincronizadoRecord || 0,
										rezagado: fileImportData.rezagadoRecord || 0,
										error: fileImportData.errorRecord || 0,
									}
								})

								// Si está completado, detener polling
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

					processedCount += recordsBatch.length

					// Actualizar progreso local (el polling actualizará los estados específicos)
					setProcessingProgress((prev) =>
						prev
							? {
								...prev,
								current: processedCount,
							}
							: null
					)
				}

				// Esperar un poco para que el último polling actualice
				await new Promise((resolve) => setTimeout(resolve, 1000))

				// Limpiar progreso para mostrar el resumen (independientemente si falla el fetch final)
				setProcessingProgress(null)

				// Obtener el estado final usando el wrapper de API
				const finalResponse = await loadFileApi.getImportProgress(fileImport.idFileImport)

				if ('error' in finalResponse || !finalResponse.data) {
					console.error('Error al obtener estado final:', finalResponse.error)
					// Fallback a los resultados de validación local si falla el fetch final
					setProcessingResult({
						...result,
						sincronizadoCount: 0,
						rezagadoCount: 0,
					})
				} else {
					const finalData = finalResponse.data
					// Actualizar resultado con los datos consolidados del backend
					setProcessingResult({
						...result,
						sincronizadoCount: finalData.sincronizadoRecord || 0,
						rezagadoCount: finalData.rezagadoRecord || 0,
						// Sumamos errores locales detectados + errores reportados por el backend
						errorCount: finalData.errorRecord || result.errorCount,
					})
				}
			} else {
				// Si no hay registros válidos, solo mostrar errores
				setProcessingResult({
					...result,
					sincronizadoCount: 0,
					rezagadoCount: 0,
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
					/>
				</div>
			)}

			{/* Mostrar resumen si hay resultado, sino mostrar área de carga */}
			{processingResult && !processingProgress ? (
				<ProcessingSummary
					result={processingResult}
					fileName={selectedFile?.name || 'archivo'}
					onUploadAnother={handleUploadAnother}
				/>
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
		</div>
	)
}
