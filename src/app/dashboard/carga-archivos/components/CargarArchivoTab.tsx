'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/features/shared/ui/button'
import { AlertModal } from '@/features/shared/ui/modal'
import { FileUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
// import { validateExcelStructure } from '../lib/validate-excel-structure'
// import { processExcelFile, ProcessResult } from '../lib/process-excel-file'
import { ProcessingSummary } from './ProcessingSummary'
import { ProcessingProgress } from './ProcessingProgress'
import { UploadCommissionFileResponse } from '@/features/pre-liquidacion/types/types'
import { PreLiquidationResultResponse } from '@/features/pre-liquidacion/types/api-types'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { Label } from '@/features/shared/ui/label'

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
	const [manualFileType, setManualFileType] = useState('AUTO')
	const [errorModalOpen, setErrorModalOpen] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')
	const [errorModalTitle, setErrorModalTitle] = useState<string | undefined>(
		undefined
	)
	const [processingResult, setProcessingResult] = useState<PreLiquidationResultResponse['summary'] | null>(null)
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

	const handleCancelUpload = useCallback(() => {
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
	}, [])

	// Función para validar el formato del archivo
	const validateFileFormat = useCallback(
		(file: File): { isValid: boolean; error?: string } => {
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
						'Formato de archivo no válido. Solo se permiten archivos .xlsx o .xls',
				}
			}

			return { isValid: true }
		},
		[]
	)

	const handleFileSelect = useCallback(
		(file: File) => {
			// Validar formato de archivo
			const formatValidation = validateFileFormat(file)
			if (!formatValidation.isValid) {
				setErrorMessage(
					formatValidation.error || 'Formato de archivo no válido'
				)
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
		},
		[validateFileFormat]
	)

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

		// Validar formato del archivo antes de cargar (Validación básica cliente)
		const formatValidation = validateFileFormat(selectedFile)
		if (!formatValidation.isValid) {
			setErrorMessage(
				formatValidation.error ||
				'Formato de archivo no válido. Solo se permiten archivos .xlsx o .xls'
			)
			setErrorModalTitle(undefined)
			setErrorModalOpen(true)
			return
		}

		setIsUploading(true)
		abortControllerRef.current = new AbortController()

		try {
			// 1. Cargar Archivo (T009)
			const formData = new FormData()
			formData.append('file', selectedFile)
			formData.append('manualFileType', manualFileType)

			const uploadResponse = await fetch('/api/carga-archivos/file-import', {
				method: 'POST',
				body: formData,
				signal: abortControllerRef.current?.signal,
			})

			if (!uploadResponse.ok) {
				const errorData = await uploadResponse.json()
				throw new Error(errorData.error || 'Error al cargar el archivo')
			}

			const uploadResult: UploadCommissionFileResponse = await uploadResponse.json()
			const { fileId, totalRows } = uploadResult

			// 2. Iniciar Procesamiento (T011)
			const processResponse = await fetch('/api/pre-liquidacion/procesar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileId }),
				signal: abortControllerRef.current?.signal,
			})

			if (!processResponse.ok) {
				const errorData = await processResponse.json()
				throw new Error(errorData.error || 'Error al iniciar procesamiento')
			}

			// 3. Polling de Resultados (T022)
			setProcessingProgress({
				current: 0,
				total: totalRows,
				sincronizado: 0,
				rezagado: 0,
				error: 0,
			})

			const pollProgress = () => {
				pollIntervalRef.current = setInterval(async () => {
					try {
						const resultsResponse = await fetch(
							`/api/pre-liquidacion/resultados/${fileId}`
						)
						if (resultsResponse.ok) {
							const { data }: { data: PreLiquidationResultResponse } = await resultsResponse.json()

							// Update progress
							setProcessingProgress((prev) => ({
								current: Math.floor((data.progress / 100) * totalRows),
								total: totalRows,
								sincronizado: data.summary?.successfulRows || 0,
								rezagado: 0,
								error: data.summary?.failedRows || 0
							}))

							if (data.status === 'COMPLETED' || data.status === 'PRELIQUIDADO' || data.status === 'CLOSED') {
								if (pollIntervalRef.current) {
									clearInterval(pollIntervalRef.current)
									pollIntervalRef.current = null
								}

								setProcessingProgress(null)
								setProcessingResult(data.summary)
								setIsUploading(false)
							}
						}
					} catch (error) {
						console.error('Error polling results:', error)
					}
				}, 2000)
			}

			pollProgress()

		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				console.log('Carga cancelada')
				return
			}
			console.error('Error al procesar archivo:', error)
			setErrorMessage(
				error instanceof Error ? error.message : 'Error al procesar el archivo.'
			)
			setErrorModalTitle('Error de Procesamiento')
			setErrorModalOpen(true)
			setIsUploading(false)
		}
	}, [selectedFile, validateFileFormat])

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
					'Formato de archivo no válido. Solo se permiten archivos .xlsx o .xls'
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

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
						<div className="space-y-2">
							<Label htmlFor="file-type">Tipo de Archivo (Opcional)</Label>
							<Select
								value={manualFileType}
								onValueChange={setManualFileType}
								disabled={isUploading}
							>
								<SelectTrigger id="file-type" className="bg-background text-foreground">
									<SelectValue placeholder="Detección Automática" />
								</SelectTrigger>
								<SelectContent className="bg-popover text-popover-foreground">
									<SelectItem value="AUTO">Detección Automática</SelectItem>
									<SelectItem value="VOLUNTARIA">Voluntarias</SelectItem>
									<SelectItem value="POLIZA">Pólizas</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground italic">
								* Use esto si el sistema no reconoce el formato automáticamente.
							</p>
						</div>
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
							className="text-foreground"
						>
							<X className="h-4 w-4" />
							Limpiar
						</Button>
						<Button
							onClick={handleUpload}
							disabled={!selectedFile || isUploading}
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
