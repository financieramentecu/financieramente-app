'use client'

import { FileText, RefreshCw, Trash2, AlertCircle, Search, Calendar, Filter, X } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { useFileHistory } from '../hooks/use-file-history'
import { ConfirmModal } from '@/features/shared/ui/modal'
import { useState, useMemo } from 'react'

/**
 * Componente para mostrar el historial de cargas de archivos
 */
export function HistorialCargasTab() {
	const { historial, isLoading, error, refetch, deleteItem } = useFileHistory()
	const [deleteModalOpen, setDeleteModalOpen] = useState(false)
	const [itemToDelete, setItemToDelete] = useState<string | null>(null)

	// Filter States
	const [searchTerm, setSearchTerm] = useState('')
	const [statusFilter, setStatusFilter] = useState('ALL')
	const [dateStart, setDateStart] = useState('')
	const [dateEnd, setDateEnd] = useState('')

	const handleDeleteClick = (id: string) => {
		setItemToDelete(id)
		setDeleteModalOpen(true)
	}

	const handleConfirmDelete = async () => {
		if (itemToDelete) {
			await deleteItem(itemToDelete)
			setDeleteModalOpen(false)
			setItemToDelete(null)
		}
	}

	const handleClearFilters = () => {
		setSearchTerm('')
		setStatusFilter('ALL')
		setDateStart('')
		setDateEnd('')
	}

	const filteredHistorial = useMemo(() => {
		return historial.filter(item => {
			// Filter by name or user
			if (searchTerm) {
				const term = searchTerm.toLowerCase()
				const matchesName = item.nombreArchivo.toLowerCase().includes(term)
				const matchesUser = item.usuario.toLowerCase().includes(term)
				if (!matchesName && !matchesUser) return false
			}

			// Filter by status
			if (statusFilter !== 'ALL' && item.estado !== statusFilter) {
				return false
			}

			// Filter by date range
			if (item.createdAt) {
				const itemDate = item.createdAt.substring(0, 10) // YYYY-MM-DD
				if (dateStart && itemDate < dateStart) return false
				if (dateEnd && itemDate > dateEnd) return false
			}

			return true
		})
	}, [historial, searchTerm, statusFilter, dateStart, dateEnd])



	return (
		<div className="space-y-6">
			{/* Modal de confirmación de eliminación */}
			<ConfirmModal
				open={deleteModalOpen}
				onOpenChange={setDeleteModalOpen}
				title="¿Eliminar registro?"
				message="Esta acción eliminará el registro de carga y todas las liquidaciones asociadas. Esta acción no se puede deshacer."
				confirmText="Eliminar"
				cancelText="Cancelar"
				onConfirm={handleConfirmDelete}
				onCancel={() => setDeleteModalOpen(false)}
				destructive={true}
			/>

			{/* Panel de Filtros */}
			<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
						<Filter className="h-4 w-4" /> Filtros
					</h3>
					{(searchTerm || statusFilter !== 'ALL' || dateStart || dateEnd) && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleClearFilters}
							className="text-gray-500 hover:text-gray-900 h-8"
						>
							<X className="h-3.5 w-3.5 mr-1" /> Limpiar filtros
						</Button>
					)}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					{/* Buscador */}
					<div className="space-y-2">
						<Label className="text-xs">Buscar</Label>
						<div className="relative">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
							<Input
								placeholder="Nombre o usuario..."
								className="pl-9"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
					</div>

					{/* Estado */}
					<div className="space-y-2">
						<Label className="text-xs">Estado</Label>
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger>
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">Todos</SelectItem>
								<SelectItem value="LOAD">Cargado (Load)</SelectItem>
								<SelectItem value="COMPLETADO">Completado</SelectItem>
								<SelectItem value="PARCIAL">Parcial</SelectItem>
								<SelectItem value="ERROR">Error</SelectItem>
								<SelectItem value="PROCESANDO">Procesando</SelectItem>
								<SelectItem value="CANCELADO">Cancelado</SelectItem>
								<SelectItem value="PRELIQUIDADO">Pre-liquidado</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Fecha Inicio */}
					<div className="space-y-2">
						<Label className="text-xs">Desde</Label>
						<div className="relative">
							<Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
							<Input
								type="date"
								className="pl-9"
								value={dateStart}
								onChange={(e) => setDateStart(e.target.value)}
							/>
						</div>
					</div>

					{/* Fecha Fin */}
					<div className="space-y-2">
						<Label className="text-xs">Hasta</Label>
						<div className="relative">
							<Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
							<Input
								type="date"
								className="pl-9"
								value={dateEnd}
								onChange={(e) => setDateEnd(e.target.value)}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Sección de Historial de Cargas */}
			<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
				{/* Header con título y botón limpiar */}
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-2">
						<RefreshCw className="h-5 w-5 text-[#00505C]" />
						<h2 className="text-lg font-semibold text-[#00505C]">
							Historial de Cargas
						</h2>
						<Button
							variant="ghost"
							size="sm"
							onClick={refetch}
							className="ml-2 h-8 w-8 p-0"
							title="Recargar"
						>
							<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
						</Button>
					</div>

				</div>

				{error && (
					<div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
						<AlertCircle className="h-5 w-5" />
						<p>{error}</p>
					</div>
				)}

				{isLoading && historial.length === 0 ? (
					<div className="text-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00505C] mx-auto"></div>
						<p className="text-muted-foreground mt-4">Cargando historial...</p>
					</div>
				) : filteredHistorial.length === 0 ? (
					<div className="text-center py-12">
						<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-muted-foreground">
							{historial.length === 0
								? 'No hay historial de cargas disponible'
								: 'No se encontraron resultados con los filtros aplicados'}
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{filteredHistorial.map((carga) => (
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
											<div className="flex items-center gap-2 mb-2">
												<h3 className="font-semibold text-[#00505C]">
													{carga.nombreArchivo}
												</h3>

												<span className={`px-2 py-0.5 rounded text-xs font-medium ${carga.estado === 'LOAD' ? 'bg-blue-100 text-blue-700' :
													carga.estado === 'COMPLETADO' ? 'bg-green-100 text-green-700' :
														carga.estado === 'ERROR' ? 'bg-red-100 text-red-700' :
															carga.estado === 'PRELIQUIDADO' ? 'bg-purple-100 text-purple-700' :
																'bg-blue-100 text-blue-700'
													}`}>
													{carga.estado}
												</span>
											</div>

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
												<span className="text-orange-600 font-medium">
													{carga.rezagados} rezagados
												</span>
											</div>
										</div>
									</div>

									{/* Botón de eliminar individual */}
									<div className="flex items-center gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleDeleteClick(carga.id)}
											className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2"
											title="Eliminar registro"
										>
											<Trash2 className="h-4 w-4" />
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

