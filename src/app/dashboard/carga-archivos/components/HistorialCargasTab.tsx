'use client'

import { useState, useEffect } from 'react'
import { FileText, RefreshCw, Trash2, Download, X } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { cn } from '@/lib/utils'

interface CargaHistorial {
	id: string
	nombreArchivo: string
	fechaCarga: string
	horaCarga: string
	usuario: string
	exitosos: number
	errores: number
	sincronizados: number
	sinRegistro: number
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
				// Datos mock para visualizar el diseño
				setHistorial([
					{
						id: '1',
						nombreArchivo: 'covers_skandia_sept_2024.csv',
						fechaCarga: '20/1/2024',
						horaCarga: '5:30:00 a. m.',
						usuario: 'Ana García',
						exitosos: 142,
						errores: 5,
						sincronizados: 120,
						sinRegistro: 22,
					},
					{
						id: '2',
						nombreArchivo: 'covers_skandia_sept_2024.csv',
						fechaCarga: '20/1/2024',
						horaCarga: '5:30:00 a. m.',
						usuario: 'Ana García',
						exitosos: 142,
						errores: 5,
						sincronizados: 120,
						sinRegistro: 22,
					},
					{
						id: '3',
						nombreArchivo: 'covers_skandia_sept_2024.csv',
						fechaCarga: '20/1/2024',
						horaCarga: '5:30:00 a. m.',
						usuario: 'Ana García',
						exitosos: 142,
						errores: 5,
						sincronizados: 120,
						sinRegistro: 22,
					},
				])
			} catch (error) {
				console.error('Error al cargar historial:', error)
			} finally {
				setIsLoading(false)
			}
		}

		fetchHistorial()
	}, [])

	const handleLimpiarHistorial = () => {
		// TODO: Implementar lógica para limpiar historial
		console.log('Limpiar historial')
	}

	const handleDescargarReporte = (id: string) => {
		// TODO: Implementar descarga de reporte
		console.log('Descargar reporte:', id)
	}

	const handleVerErrores = (id: string) => {
		// TODO: Implementar visualización de errores
		console.log('Ver errores:', id)
	}

	return (
		<div className="space-y-6">
			{/* Sección de Historial de Cargas */}
			<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
				{/* Header con título y botón limpiar */}
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-2">
						<RefreshCw className="h-5 w-5 text-[#00505C]" />
						<h2 className="text-lg font-semibold text-[#00505C]">
							Historial de Cargas
						</h2>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleLimpiarHistorial}
						className="bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700"
					>
						<Trash2 className="h-4 w-4" />
						Limpiar Historial
					</Button>
				</div>

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
								className="bg-gray-50 rounded-lg p-4 border border-gray-200"
							>
								<div className="flex items-start justify-between gap-4">
									{/* Información del archivo */}
									<div className="flex items-start gap-3 flex-1">
										<FileText className="h-5 w-5 text-gray-600 mt-0.5" />
										<div className="flex-1">
											{/* Nombre del archivo */}
											<h3 className="font-semibold text-[#00505C] mb-2">
												{carga.nombreArchivo}
											</h3>
											{/* Fecha, hora y usuario */}
											<p className="text-sm text-gray-600 mb-3">
												{carga.fechaCarga}, {carga.horaCarga} • Por: {carga.usuario}
											</p>
											{/* Estadísticas */}
											<div className="flex flex-wrap items-center gap-4 text-sm">
												<span className="text-green-600 font-medium">
													{carga.exitosos} exitosos
												</span>
												<span className="text-red-600 font-medium">
													{carga.errores} errores
												</span>
												<span className="text-green-600 font-medium">
													{carga.sincronizados} sincronizados
												</span>
												<span className="text-amber-600 font-medium">
													{carga.sinRegistro} sin registro
												</span>
											</div>
										</div>
									</div>

									{/* Botones de acción */}
									<div className="flex items-center gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleDescargarReporte(carga.id)}
											className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 p-2"
										>
											<Download className="h-4 w-4 text-purple-600 mr-1.5" />
											<span className="text-purple-600">Reporte</span>
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleVerErrores(carga.id)}
											className="border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600 p-2"
										>
											<X className="h-4 w-4 text-red-600 mr-1.5" />
											<span className="text-red-600">Errores</span>
										</Button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Sección de Formato Requerido */}
			<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
				<p className="text-sm text-gray-700 leading-relaxed">
					<strong>Formato requerido de Skandia:</strong> El archivo Excel debe contener
					las columnas: Nombre, Franquicia, Desde, Hasta, Nombre Fp, Sub Grupo Fp,
					Compania, Producto, Tipo Comisión, Cto, Base, Com. El sistema validará
					automáticamente la estructura y sincronizará con los registros de agentes
					existentes.
				</p>
			</div>
		</div>
	)
}

