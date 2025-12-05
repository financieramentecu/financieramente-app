'use client'

import { useState, useEffect } from 'react'
import { FileText, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface CargaHistorial {
	id: string
	nombreArchivo: string
	fechaCarga: string
	totalRegistros: number
	registrosExitosos: number
	registrosError: number
	estado: 'completado' | 'error' | 'procesando'
}

/**
 * Componente para mostrar el historial de cargas de archivos
 */
export function HistorialCargasTab() {
	const [historial, setHistorial] = useState<CargaHistorial[]>([])
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		// TODO: Implementar llamada a API para obtener historial
		const fetchHistorial = async () => {
			setIsLoading(true)
			try {
				// Simular carga de datos
				await new Promise((resolve) => setTimeout(resolve, 1000))
				// Por ahora, datos vacíos
				setHistorial([])
			} catch (error) {
				console.error('Error al cargar historial:', error)
			} finally {
				setIsLoading(false)
			}
		}

		fetchHistorial()
	}, [])

	const getEstadoIcon = (estado: string) => {
		switch (estado) {
			case 'completado':
				return <CheckCircle2 className="h-5 w-5 text-green-600" />
			case 'error':
				return <XCircle className="h-5 w-5 text-red-600" />
			case 'procesando':
				return <Clock className="h-5 w-5 text-yellow-600" />
			default:
				return <Clock className="h-5 w-5 text-gray-600" />
		}
	}

	const getEstadoLabel = (estado: string) => {
		switch (estado) {
			case 'completado':
				return 'Completado'
			case 'error':
				return 'Error'
			case 'procesando':
				return 'Procesando'
			default:
				return 'Desconocido'
		}
	}

	return (
		<div className="space-y-6">
			<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
				<h2 className="text-xl font-semibold text-[#00505C] mb-4">
					Historial de Cargas
				</h2>

				{isLoading ? (
					<div className="text-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00505C] mx-auto"></div>
						<p className="text-muted-foreground mt-4">Cargando historial...</p>
					</div>
				) : historial.length === 0 ? (
					<div className="text-center py-12">
						<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-muted-foreground">
							No hay historial de cargas disponible
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{historial.map((carga) => (
							<div
								key={carga.id}
								className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
							>
								<div className="flex items-start justify-between">
									<div className="flex items-start gap-4 flex-1">
										<div className="mt-1">{getEstadoIcon(carga.estado)}</div>
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-2">
												<h3 className="font-semibold text-[#00505C]">
													{carga.nombreArchivo}
												</h3>
												<span className="text-sm text-muted-foreground">
													({getEstadoLabel(carga.estado)})
												</span>
											</div>
											<div className="flex items-center gap-4 text-sm text-muted-foreground">
												<div className="flex items-center gap-1">
													<Calendar className="h-4 w-4" />
													{carga.fechaCarga}
												</div>
												<div>
													Total: {carga.totalRegistros} registros
												</div>
												<div className="text-green-600">
													Exitosos: {carga.registrosExitosos}
												</div>
												{carga.registrosError > 0 && (
													<div className="text-red-600">
														Errores: {carga.registrosError}
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

