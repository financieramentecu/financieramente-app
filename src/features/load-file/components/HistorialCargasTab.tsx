'use client'

import {
	FileText,
	RefreshCw,
	Trash2,
	AlertCircle,
	Search,
	Filter,
	X,
	Eye,
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { TableRowsLoadingSkeleton } from '@/features/shared/ui/loading-skeletons'
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
import { ConfirmModal, Modal } from '@/features/shared/ui/modal'
import { RecordsByStatusView } from './RecordsByStatusView'
import { useState, useEffect } from 'react'

/**
 * Componente para mostrar el historial de cargas de archivos
 */
export function HistorialCargasTab() {
	const [deleteModalOpen, setDeleteModalOpen] = useState(false)
	const [itemToDelete, setItemToDelete] = useState<string | null>(null)
	const [detailFileImportId, setDetailFileImportId] = useState<number | null>(
		null
	)

	// Filter States
	const [searchTerm, setSearchTerm] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)
	const [statusFilter, setStatusFilter] = useState('ALL')
	const [mesFilter, setMesFilter] = useState<string>('ALL')
	const [anioFilter, setAnioFilter] = useState<string>('ALL')

	// 200ms debounce for searchTerm
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchTerm), 200)
		return () => clearTimeout(timer)
	}, [searchTerm])

	const { historial, isLoading, error, refetch, deleteItem } = useFileHistory({
		month: mesFilter !== 'ALL' ? Number(mesFilter) : undefined,
		year: anioFilter !== 'ALL' ? Number(anioFilter) : undefined,
		status: statusFilter !== 'ALL' ? statusFilter : undefined,
		search: debouncedSearch || undefined,
	})

	const currentYear = new Date().getFullYear()
	const yearRange = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

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
		setMesFilter('ALL')
		setAnioFilter('ALL')
	}

	const getEstadoBadgeStyle = (estado: string): React.CSSProperties => {
		switch (estado) {
			case 'COMPLETED':
			case 'PRE-SETTLED':
				return {
					backgroundColor: '#dcfce7',
					color: '#166534',
					border: '1px solid #86efac',
				}
			case 'ERROR':
				return {
					backgroundColor: '#fee2e2',
					color: '#991b1b',
					border: '1px solid #fca5a5',
				}
			case 'PROCESSING':
				return {
					backgroundColor: '#dbeafe',
					color: '#1e40af',
					border: '1px solid #93c5fd',
				}
			case 'PARCIAL':
				return {
					backgroundColor: '#fef9c3',
					color: '#854d0e',
					border: '1px solid #fde047',
				}
			case 'CANCELADO':
				return {
					backgroundColor: '#fef3c7',
					color: '#92400e',
					border: '1px solid #fcd34d',
				}
			case 'LOAD':
			default:
				return {
					backgroundColor: '#e0f2fe',
					color: '#075985',
					border: '1px solid #7dd3fc',
				}
		}
	}

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

			<Modal
				open={detailFileImportId !== null}
				onOpenChange={(open) => !open && setDetailFileImportId(null)}
				title="Detalle por estado"
				size="full"
				className="left-[2%]! top-[2%]! translate-x-0! translate-y-0! w-[96vw]! max-w-[96vw]! h-[96vh]! max-h-[96vh]! flex flex-col items-stretch! gap-0!"
			>
				{detailFileImportId !== null && (
					<div className="flex-1 min-h-0 overflow-y-auto w-full pt-2">
						<RecordsByStatusView
							fileImportId={detailFileImportId}
							compact
						/>
					</div>
				)}
			</Modal>

			{/* Panel de Filtros */}
			<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
						<Filter className="h-4 w-4" /> Filtros
					</h3>
					{(searchTerm || statusFilter !== 'ALL' || mesFilter !== 'ALL' || anioFilter !== 'ALL') && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleClearFilters}
							className="text-muted-foreground hover:text-foreground h-8"
							aria-label="Limpiar filtros"
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
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
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
								<SelectItem value="LOAD">Cargado</SelectItem>
								<SelectItem value="COMPLETED">Completado</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Mes */}
					<div className="space-y-2">
						<Label className="text-xs">Mes</Label>
						<Select value={mesFilter} onValueChange={setMesFilter}>
							<SelectTrigger>
								<SelectValue placeholder="Mes" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">Todos los meses</SelectItem>
								{[
									['1', 'Enero'],
									['2', 'Febrero'],
									['3', 'Marzo'],
									['4', 'Abril'],
									['5', 'Mayo'],
									['6', 'Junio'],
									['7', 'Julio'],
									['8', 'Agosto'],
									['9', 'Septiembre'],
									['10', 'Octubre'],
									['11', 'Noviembre'],
									['12', 'Diciembre'],
								].map(([val, label]) => (
									<SelectItem key={val} value={val}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Año */}
					<div className="space-y-2">
						<Label className="text-xs">Año</Label>
						<Select value={anioFilter} onValueChange={setAnioFilter}>
							<SelectTrigger>
								<SelectValue placeholder="Año" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">Todos los años</SelectItem>
								{yearRange.map((y) => (
									<SelectItem key={y} value={String(y)}>
										{y}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			{/* Sección de Historial de Cargas */}
			<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
				{/* Header con título y botón recargar */}
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-2">
						<RefreshCw className="h-5 w-5 text-primary" />
						<h2 className="text-lg font-semibold text-primary">
							Historial de Cargas
						</h2>
						<Button
							variant="ghost"
							size="sm"
							onClick={refetch}
							className="ml-2 h-8 w-8 p-0"
							title="Recargar"
						>
							<RefreshCw
								className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
							/>
						</Button>
					</div>
				</div>

				{error && (
					<div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
						<AlertCircle className="h-5 w-5" />
						<p>{error}</p>
					</div>
				)}

				{isLoading && historial.length === 0 ? (
					<TableRowsLoadingSkeleton rows={5} />
				) : historial.length === 0 ? (
					<EmptyState
						icon={<FileText className="h-12 w-12" />}
						title="No hay historial de cargas disponible"
					/>
				) : (
					<div className="space-y-4">
						<p className="text-xs text-muted-foreground">
							Los contadores de cada archivo reflejan el total acumulado de todas las sincronizaciones realizadas.
						</p>
						{historial.map((carga) => (
							<div
								key={carga.id}
								className="bg-muted rounded-lg p-4 border border-border"
							>
								<div className="flex items-start justify-between gap-4">
									{/* Información del archivo */}
									<div className="flex items-start gap-3 flex-1">
										<FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
										<div className="flex-1">
											{/* Nombre del archivo y badge de estado */}
											<div className="flex items-center gap-2 mb-2">
												<h3 className="font-semibold text-primary">
													{carga.nombreArchivo}
												</h3>
												<span
													className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
													style={getEstadoBadgeStyle(carga.estado)}
												>
													{carga.estado}
												</span>
											</div>

											{/* Fecha, hora y usuario */}
											<p className="text-sm text-muted-foreground mb-3">
												{carga.fechaCarga}, {carga.horaCarga} • Por:{' '}
												{carga.usuario}
											</p>

											{/* Badges de estadísticas */}
											<div className="flex flex-wrap items-center gap-2">
												<span
													className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
													style={{
														backgroundColor: '#dcfce7',
														color: '#166534',
														border: '1px solid #86efac',
													}}
												>
													<span
														className="w-1.5 h-1.5 rounded-full"
														style={{ backgroundColor: '#16a34a' }}
													/>
													{carga.exitosos} exitosos
												</span>
												<span
													className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
													style={{
														backgroundColor: '#fee2e2',
														color: '#991b1b',
														border: '1px solid #fca5a5',
													}}
												>
													<span
														className="w-1.5 h-1.5 rounded-full"
														style={{ backgroundColor: '#dc2626' }}
													/>
													{carga.errores} errores
												</span>
												<span
													className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
													style={{
														backgroundColor: '#dbeafe',
														color: '#1e40af',
														border: '1px solid #93c5fd',
													}}
												>
													<span
														className="w-1.5 h-1.5 rounded-full"
														style={{ backgroundColor: '#3b82f6' }}
													/>
													{carga.sincronizados} sincronizados
												</span>
												<span
													className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
													style={{
														backgroundColor: '#fef9c3',
														color: '#854d0e',
														border: '1px solid #fde047',
													}}
												>
													<span
														className="w-1.5 h-1.5 rounded-full"
														style={{ backgroundColor: '#eab308' }}
													/>
													{carga.sinRegistro} sin registro
												</span>
												<span
													className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
													style={{
														backgroundColor: '#fef3c7',
														color: '#92400e',
														border: '1px solid #fcd34d',
													}}
												>
													<span
														className="w-1.5 h-1.5 rounded-full"
														style={{ backgroundColor: '#f59e0b' }}
													/>
													{carga.rezagados} rezagados
												</span>
											</div>
										</div>
									</div>

									{/* Botones Ver detalle y Eliminar */}
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setDetailFileImportId(parseInt(carga.id, 10))
											}
											className="p-2"
											title="Ver detalle por estado"
										>
											<Eye className="h-4 w-4 mr-1" />
											Ver detalle
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleDeleteClick(carga.id)}
											className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2"
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
			<div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-3">
				<p className="text-sm text-foreground leading-relaxed">
					<strong>Formato requerido de Skandia:</strong> Seleccione el tipo de
					archivo y use la estructura correspondiente. El sistema validará
					automáticamente las columnas y sincronizará con los registros existentes.
				</p>
				<div className="text-sm text-foreground space-y-2">
					<p>
						<strong>Voluntaria:</strong> Nombre Franquicia, Desde, Hasta, Nombre
						Fp, Sub Grupo Fp, Compania, Producto, Tipo de Comision, Cto, Base,
						Com.
					</p>
					<p>
						<strong>Póliza:</strong> Polizas Periodo, Plan de Compensación, Valor
						Comisión, BASE, Polizas Producto, Contrato Largo, Polizas Id
						Agente, Polizas Nombre Agente, Polizas Id Sociedad, Nombre Sociedad,
						Polizas Clasificación.
					</p>
				</div>
			</div>
		</div>
	)
}
