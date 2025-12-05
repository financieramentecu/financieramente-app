'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/features/shared/ui/button'
import { AlertModal } from '@/features/shared/ui/modal'
import { FileUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
			setErrorModalOpen(true)
			return
		}

		// Validar tamaño
		if (file.size > MAX_FILE_SIZE) {
			setErrorMessage('El archivo es demasiado grande. El tamaño máximo es 50MB')
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
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}, [])

	const handleUpload = useCallback(async () => {
		if (!selectedFile) return

		// Validar formato del archivo antes de cargar
		const formatValidation = validateFileFormat(selectedFile)
		if (!formatValidation.isValid) {
			setErrorMessage(formatValidation.error || 'Formato de archivo no válido. Solo se permiten archivos .xlsx o .xls')
			setErrorModalOpen(true)
			return
		}

		// Validar tamaño antes de cargar
		if (selectedFile.size > MAX_FILE_SIZE) {
			setErrorMessage('El archivo es demasiado grande. El tamaño máximo es 50MB')
			setErrorModalOpen(true)
			return
		}

		setIsUploading(true)
		try {
			// TODO: Implementar la lógica de carga
			const formData = new FormData()
			formData.append('file', selectedFile)

			// Simular carga (reemplazar con llamada real a API)
			await new Promise((resolve) => setTimeout(resolve, 2000))

			alert('Archivo cargado exitosamente')
			handleClear()
		} catch (error) {
			console.error('Error al cargar archivo:', error)
			setErrorMessage('Error al cargar el archivo. Por favor, intenta nuevamente.')
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
				message={errorMessage || 'Formato de archivo no válido. Solo se permiten archivos .xlsx o .xls'}
				confirmText="Aceptar"
				onConfirm={() => setErrorModalOpen(false)}
			/>

			{/* Card de carga */}
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
		</div>
	)
}

