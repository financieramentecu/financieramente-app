'use client'

import { Button } from '@/features/shared/ui/button'
import { Modal } from '@/features/shared/ui/modal'
import { CheckCircle2, XCircle, Download } from 'lucide-react'
import { ProcessResult } from '../lib/process-excel-file'
import { generateErrorReportCSV, downloadCSV } from '../lib/generate-error-report'

interface ProcessingResultModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	result: ProcessResult | null
	fileName: string
}

export function ProcessingResultModal({
	open,
	onOpenChange,
	result,
	fileName,
}: ProcessingResultModalProps) {
	if (!result) return null

	const handleDownloadErrorReport = () => {
		if (result.errorRecords.length === 0) return

		const csvContent = generateErrorReportCSV(result.errorRecords, result.headers)
		const timestamp = new Date().toISOString().split('T')[0]
		const reportFileName = `errores_${fileName.replace(/\.[^/.]+$/, '')}_${timestamp}.csv`
		downloadCSV(csvContent, reportFileName)
	}

	const hasErrors = result.errorCount > 0
	const hasSuccess = result.successCount > 0

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title="Resultado del Procesamiento"
			size="md"
		>
			<div className="space-y-4">
				{/* Resumen */}
				<div className="bg-gray-50 rounded-lg p-4 space-y-3">
					{hasSuccess && (
						<div className="flex items-center gap-2 text-green-600">
							<CheckCircle2 className="h-5 w-5" />
							<span className="font-medium">
								{result.successCount} registro{result.successCount !== 1 ? 's' : ''} cargado
								{result.successCount !== 1 ? 's' : ''} exitosamente
							</span>
						</div>
					)}
					{hasErrors && (
						<div className="flex items-center gap-2 text-red-600">
							<XCircle className="h-5 w-5" />
							<span className="font-medium">
								{result.errorCount} registro{result.errorCount !== 1 ? 's' : ''} con error
								{result.errorCount !== 1 ? 'es' : ''}
							</span>
						</div>
					)}
				</div>

				{/* Mensaje de resumen según requerimiento */}
				<div className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3">
					<p className="font-medium">
						{result.successCount} registro{result.successCount !== 1 ? 's' : ''} cargado
						{result.successCount !== 1 ? 's' : ''} exitosamente
						{hasErrors && `, ${result.errorCount} registro${result.errorCount !== 1 ? 's' : ''} con error${result.errorCount !== 1 ? 'es' : ''}`}
					</p>
				</div>

				{/* Botón para descargar reporte de errores */}
				{hasErrors && (
					<div className="pt-2">
						<Button
							onClick={handleDownloadErrorReport}
							variant="outline"
							className="w-full"
						>
							<Download className="h-4 w-4 mr-2" />
							Descargar Reporte de Errores (CSV)
						</Button>
					</div>
				)}

				{/* Botón de cerrar */}
				<div className="pt-2">
					<Button
						onClick={() => onOpenChange(false)}
						className="w-full bg-[#00505C] hover:bg-[#003c45] text-white"
					>
						Aceptar
					</Button>
				</div>
			</div>
		</Modal>
	)
}

