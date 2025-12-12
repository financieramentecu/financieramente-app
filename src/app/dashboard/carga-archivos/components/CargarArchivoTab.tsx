'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/features/shared/ui/button'
import { AlertModal } from '@/features/shared/ui/modal'
import { FileUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateExcelStructure } from '../lib/validate-excel-structure'
import { processExcelFile, ProcessResult } from '../lib/process-excel-file'
import { ProcessingSummary } from './ProcessingSummary'
import { ProcessingProgress } from './ProcessingProgress'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ACCEPTED_FILE_TYPES = [
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
	'application/vnd.ms-excel', // .xls
]
const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls']

export function CargarArchivoTab() {
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [isUploading, setIsUploading] = useState(false)
	const [errorModalOpen, setErrorModalOpen] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')
	const [errorModalTitle, setErrorModalTitle] = useState<string | undefined>(undefined)
	const [processingResult, setProcessingResult] = useState<ProcessResult & { sincronizadoCount: number; rezagadoCount: number } | null>(null)
	const [processingProgress, setProcessingProgress] = useState<{
		current: number
		total: number
		sincronizado: number
		rezagado: number
		error: number
	} | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	// Función para validar el formato del archivo
	const validateFileFormat = useCallback((file: File): { isValid: boolean; error?: string } => {
		// Validar por extensión de archivo
		const fileName = file.name.toLowerCase()
		const hasValidExtension = ACCEPTED_EXTENSIONS.some(ext => fileName.endsWith(ext))
		
		// Validar por tipo MIME
		const hasValidMimeType = ACCEPTED_FILE_TYPES.includes(file.type)
		
		// El archivo es válido si tiene una extensión válida O un tipo MIME válido
		// (algunos navegadores no siempre detectan correctamente el tipo MIME)
		if (!hasValidExtension && !hasValidMimeType) {
			return {
				isValid: false,
				error: 'Formato de archivo no válido. Solo se permiten archivos .xlsx o .xls',
			}
		}
		
		return { isValid: true }
	}, [])

		const handleFileSelect = useCallback((file: File) => {
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
			setErrorMessage('El archivo es demasiado grande. El tamaño máximo es 50MB')
			setErrorModalTitle(undefined)
			setErrorModalOpen(true)
			return
		}

		setSelectedFile(file)
	}, [validateFileFormat])

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(true)
	}, [])

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(false)
	}, [])

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()
			e.stopPropagation()
			setIsDragging(false)

			const files = Array.from(e.dataTransfer.files)
			if (files.length > 0) {
				handleFileSelect(files[0])
			}
		},
		[handleFileSelect]
	)

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files
			if (files && files.length > 0) {
				handleFileSelect(files[0])
			}
		},
		[handleFileSelect]
	)

	const handleSelectFile = useCallback(() => {
		fileInputRef.current?.click()
	}, [])

	const handleClear = useCallback(() => {
		setSelectedFile(null)
		setProcessingResult(null)
		setProcessingProgress(null)
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}, [])

	const handleUploadAnother = useCallback(() => {
		handleClear()
	}, [handleClear])

	const handleUpload = useCallback(async () => {
		if (!selectedFile) return

		// Validar formato del archivo antes de cargar
		const formatValidation = validateFileFormat(selectedFile)
		if (!formatValidation.isValid) {
			setErrorMessage(formatValidation.error || 'Formato de archivo no válido. Solo se permiten archivos .xlsx o .xls')
			setErrorModalTitle(undefined)
			setErrorModalOpen(true)
			return
		}

		// Validar tamaño antes de cargar
		if (selectedFile.size > MAX_FILE_SIZE) {
			setErrorMessage('El archivo es demasiado grande. El tamaño máximo es 50MB')
			setErrorModalTitle(undefined)
			setErrorModalOpen(true)
			return
		}

		// Validar estructura del archivo Excel
		setIsUploading(true)
		try {
			const structureValidation = await validateExcelStructure(selectedFile)
			
			if (!structureValidation.isValid) {
				// Mostrar modal con el mensaje exacto según el diseño
				setErrorMessage('El archivo no contiene la estructura esperada de Skandia. Verifique las columnas requeridas.')
				setErrorModalTitle('ESTRUCTURA INCORRECTA')
				setErrorModalOpen(true)
				setIsUploading(false)
				return
			}

			// Si la validación es exitosa, procesar el archivo
			const result = await processExcelFile(selectedFile)

			// Crear FileImport
			const fileImportResponse = await fetch('/api/carga-archivos/file-import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileName: selectedFile.name }),
			})

			if (!fileImportResponse.ok) {
				throw new Error('Error al crear registro de importación')
			}

			const { fileImport } = await fileImportResponse.json()

			// Procesar y guardar registros válidos con progreso
			if (result.validRecords.length > 0) {
				setProcessingProgress({
					current: 0,
					total: result.validRecords.length,
					sincronizado: 0,
					rezagado: 0,
					error: 0,
				})

				// Función para hacer polling del progreso
				let pollInterval: NodeJS.Timeout | null = null
				const pollProgress = (fileImportId: number): void => {
					pollInterval = setInterval(async () => {
						try {
							const progressResponse = await fetch(
								`/api/carga-archivos/file-import/${fileImportId}`
							)
							if (progressResponse.ok) {
								const fileImportData = await progressResponse.json()
								setProcessingProgress({
									current: fileImportData.totalRecord || 0,
									total: result.validRecords.length,
									sincronizado: fileImportData.sincronizadoRecord || 0,
									rezagado: fileImportData.rezagadoRecord || 0,
									error: fileImportData.errorRecord || 0,
								})

								// Si está completado, detener polling
								if (fileImportData.status === 'COMPLETADO') {
									if (pollInterval) {
										clearInterval(pollInterval)
										pollInterval = null
									}
								}
							}
						} catch (error) {
							console.error('Error al obtener progreso:', error)
						}
					}, 500) // Polling cada 500ms

					// Limpiar intervalo después de 5 minutos como seguridad
					setTimeout(() => {
						if (pollInterval) {
							clearInterval(pollInterval)
							pollInterval = null
						}
					}, 5 * 60 * 1000)
				}

				// Iniciar polling
				pollProgress(fileImport.idFileImport)

				// Llamar a la API para procesar registros (procesa en batches)
				const processResponse = await fetch('/api/carga-archivos/process-batch', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						fileImportId: fileImport.idFileImport,
						records: result.validRecords,
						headers: result.headers,
						batchSize: 10, // Procesar 10 registros por batch
					}),
				})

				if (!processResponse.ok) {
					throw new Error('Error al procesar registros')
				}

				const processData = await processResponse.json()

				// Esperar un poco para que el último polling actualice
				await new Promise((resolve) => setTimeout(resolve, 1000))

				// Obtener el estado final
				const finalResponse = await fetch(
					`/api/carga-archivos/file-import/${fileImport.idFileImport}`
				)
				const finalData = finalResponse.ok ? await finalResponse.json() : processData.summary

				// Actualizar progreso con los resultados finales
				setProcessingProgress(null)

				// Actualizar resultado con los datos del procesamiento
				setProcessingResult({
					...result,
					sincronizadoCount: finalData.sincronizadoRecord || processData.summary.sincronizado || 0,
					rezagadoCount: finalData.rezagadoRecord || processData.summary.rezagado || 0,
					errorCount: result.errorCount + (finalData.errorRecord || processData.summary.error || 0), // Errores de validación + errores de procesamiento
				})
			} else {
				// Si no hay registros válidos, solo mostrar errores
				setProcessingResult({
					...result,
					sincronizadoCount: 0,
					rezagadoCount: 0,
				})
			}
		} catch (error) {
			console.error('Error al procesar archivo:', error)
			setErrorMessage('Error al procesar el archivo. Por favor, intenta nuevamente.')
			setErrorModalTitle(undefined)
			setErrorModalOpen(true)
		} finally {
			setIsUploading(false)
		}
	}, [selectedFile, handleClear, validateFileFormat])

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
				message={errorMessage || 'Formato de archivo no válido. Solo se permiten archivos .xlsx o .xls'}
				confirmText={errorModalTitle ? 'ACEPTAR' : 'Aceptar'}
				onConfirm={() => {
					setErrorModalOpen(false)
					setErrorModalTitle(undefined)
				}}
			/>

			{/* Mostrar progreso si está procesando */}
			{processingProgress && (
				<ProcessingProgress
					current={processingProgress.current}
					total={processingProgress.total}
					sincronizado={processingProgress.sincronizado}
					rezagado={processingProgress.rezagado}
					error={processingProgress.error}
				/>
			)}

			{/* Mostrar resumen si hay resultado, sino mostrar área de carga */}
			{processingResult && !processingProgress ? (
				<ProcessingSummary
					result={processingResult}
					fileName={selectedFile?.name || 'archivo'}
					onUploadAnother={handleUploadAnother}
				/>
			) : !processingProgress ? (
				<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
				<h2 className="text-xl font-semibold text-[#00505C] mb-4">
					Cargar Archivo de Covers Skandia
				</h2>
				<p className="text-muted-foreground mb-6">
					Arrastra y suelta tu archivo Excel de Skandia o haz clic para seleccionar
				</p>

				{/* Área de drag and drop */}
				<div
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					className={cn(
						'border-2 border-dashed rounded-lg p-12 text-center transition-colors',
						isDragging
							? 'border-[#00505C] bg-[#83D874]/10'
							: 'border-[#83D874] bg-[#83D874]/5',
						selectedFile && 'border-[#00505C] bg-[#83D874]/10'
					)}
				>
					{selectedFile ? (
						<div className="space-y-4">
							<FileUp className="h-16 w-16 mx-auto text-[#00505C]" />
							<div>
								<p className="text-lg font-semibold text-[#00505C]">
									{selectedFile.name}
								</p>
								<p className="text-sm text-muted-foreground mt-1">
									{formatFileSize(selectedFile.size)}
								</p>
							</div>
						</div>
					) : (
						<>
							<FileUp className="h-16 w-16 mx-auto text-[#00505C] mb-4" />
							<p className="text-lg font-medium text-[#00505C] mb-4">
								Arrastra tu archivo de Skandia aquí
							</p>
							<Button
								onClick={handleSelectFile}
								className="bg-[#00505C] hover:bg-[#003c45] text-white"
							>
								<FileUp className="h-4 w-4" />
								Seleccionar archivo
							</Button>
						</>
					)}

					<input
						ref={fileInputRef}
						type="file"
						accept=".xlsx,.xls"
						onChange={handleFileInputChange}
						className="hidden"
					/>
				</div>

				{/* Información de formatos */}
				<p className="text-sm text-muted-foreground mt-4 text-center">
					Formatos soportados: xlsx, xls • Tamaño máximo: 50MB
				</p>

				{/* Botones de acción */}
				<div className="flex justify-end gap-4 mt-6">
					<Button
						variant="outline"
						onClick={handleClear}
						disabled={!selectedFile || isUploading}
						className="text-gray-700"
					>
						<X className="h-4 w-4" />
						Limpiar
					</Button>
					<Button
						onClick={handleUpload}
						disabled={!selectedFile || isUploading}
						className="bg-[#00505C] hover:bg-[#003c45] text-white"
					>
						{isUploading ? 'Cargando...' : 'Cargar'}
					</Button>
				</div>
			</div>
			) : null}
		</div>
	)
}

