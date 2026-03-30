'use client'
import React from 'react'

import {
	FileText,
	RefreshCw,
	Trash2,
	AlertCircle,
	Search,
	Filter,
	X,
	Eye,
	Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import { ROLE_PERMISSIONS } from '@/features/auth/lib/permissions'
import type { UserRole } from '@/features/auth/lib/roles'
import { loadFileApi } from '../lib/load-file-api'
import { ModalErroresConfiguracion } from '@/features/pre-liquidacion/components/ModalErroresConfiguracion'
import type { RegistroConError } from '@/features/pre-liquidacion/types/types'

/**
 * Componente para mostrar el historial de cargas de archivos
 */

function StatBadge({
	label,
	value,
	bgColor,
	textColor,
	borderColor,
	dotColor,
}: {
	label: string
	value: number
	bgColor: string
	textColor: string
	borderColor: string
	dotColor: string
}) {
	return (
		<span
			className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
			style={{
				backgroundColor: bgColor,
				color: textColor,
				border: `1px solid ${borderColor}`,
			}}
		>
			<span
				className="w-1.5 h-1.5 rounded-full"
				style={{ backgroundColor: dotColor }}
			/>
			{value} {label}
		</span>
	)
}

export function HistorialCargasTab() {
	const { user } = useAuthSession()
	const canPreliquidar =
		user?.role != null &&
		(ROLE_PERMISSIONS[user.role as UserRole]?.liquidaciones?.preliquidacion ??
			false)

	const [deleteModalOpen, setDeleteModalOpen] = useState(false)
	const [itemToDelete, setItemToDelete] = useState<string | null>(null)
	const [detailFileImportId, setDetailFileImportId] = useState<number | null>(
		null
	)
	const [preliquidarModalOpen, setPreliquidarModalOpen] = useState(false)
	const [preliquidarTarget, setPreliquidarTarget] = useState<{
		idFileImport: number
		mes: string
		id: string
	} | null>(null)
	const [preliquidarLoading, setPreliquidarLoading] = useState<
		Record<string, boolean>
	>({})
	const [registrosConError, setRegistrosConError] = useState<RegistroConError[]>([])
	const [modalErroresOpen, setModalErroresOpen] = useState(false)

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

	const handlePreliquidarClick = (carga: {
		id: string
		idFileImport: number
		createdAt: string
	}) => {
		const date = new Date(carga.createdAt)
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const mes = `${date.getFullYear()}-${month}`
		setPreliquidarTarget({
			idFileImport: carga.idFileImport,
			mes,
			id: carga.id,
		})
		setPreliquidarModalOpen(true)
	}

	const handleConfirmPreliquidar = async () => {
		if (!preliquidarTarget) return
		const { idFileImport, mes, id } = preliquidarTarget
		setPreliquidarModalOpen(false)
		setPreliquidarLoading((prev) => ({ ...prev, [id]: true }))
		try {
			const result = await loadFileApi.preliquidar(idFileImport, mes)
			if ('error' in result) {
				toast.error('Error al pre-liquidar', { description: result.error })
			} else {
				toast.success('Pre-liquidación completada', {
					description:
						result.data?.mensaje ?? 'Registros procesados correctamente',
				})
				if (result.data?.registrosConError && result.data.registrosConError.length > 0) {
					setRegistrosConError(result.data.registrosConError)
					setModalErroresOpen(true)
				}
				await refetch()
			}
		} catch (err) {
			toast.error('Error inesperado', {
				description: err instanceof Error ? err.message : 'Error desconocido',
			})
		} finally {
			setPreliquidarLoading((prev) => ({ ...prev, [id]: false }))
			setPreliquidarTarget(null)
		}
	}

	const getEstadoBadgeStyle = (
		estado: string
	): { label: string; style: React.CSSProperties } => {
		switch (estado) {
			case 'COMPLETED':
				return {
					label: 'LIQUIDADO',
					style: {
						backgroundColor: '#dcfce7',
						color: '#166534',
						border: '1px solid #86efac',
					},
				}
			case 'PRE-SETTLED':
				return {
					label: 'Pre-liquidado',
					style: {
						backgroundColor: '#e0f2fe', // Light blue for pre-settled
						color: '#075985', // Darker blue
						border: '1px solid #7dd3fc', // Border blue
					},
				}
			case 'ERROR':
				return {
					label: 'ERROR',
					style: {
						backgroundColor: '#fee2e2',
						color: '#991b1b',
						border: '1px solid #fca5a5',
					},
				}
			case 'PROCESSING':
				return {
					label: 'PROCESANDO',
					style: {
						backgroundColor: '#dbeafe',
						color: '#1e40af',
						border: '1px solid #93c5fd',
					},
				}
			case 'PARCIAL':
				return {
					label: 'PARCIAL',
					style: {
						backgroundColor: '#fef9c3',
						color: '#854d0e',
						border: '1px solid #fde047',
					},
				}
			case 'CANCELADO':
				return {
					label: 'CANCELADO',
					style: {
						backgroundColor: '#fef3c7',
						color: '#92400e',
						border: '1px solid #fcd34d',
					},
				}
			case 'LOAD':
			default:
				return {
					label: 'SINCRONIZADO',
					style: {
						backgroundColor: '#e0f2fe',
						color: '#075985',
						border: '1px solid #7dd3fc',
					},
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

			{/* Modal de confirmación de pre-liquidación */}
			<ConfirmModal
				open={preliquidarModalOpen}
				onOpenChange={(open) => {
					setPreliquidarModalOpen(open)
					if (!open) setPreliquidarTarget(null)
				}}
				title="¿Confirmar pre-liquidación?"
				message={`Se procesarán los registros sincronizados del archivo para el período ${preliquidarTarget?.mes ?? ''}. Esta acción cambiará su estado a PRE-LIQUIDADO.`}
				confirmText="Pre-liquidar"
				cancelText="Cancelar"
				onConfirm={handleConfirmPreliquidar}
				onCancel={() => {
					setPreliquidarModalOpen(false)
					setPreliquidarTarget(null)
				}}
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
						<RecordsByStatusView fileImportId={detailFileImportId} compact />
					</div>
				)}
			</Modal>

			{/* Panel de Filtros */}
			<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
						<Filter className="h-4 w-4" /> Filtros
					</h3>
					{(searchTerm ||
						statusFilter !== 'ALL' ||
						mesFilter !== 'ALL' ||
						anioFilter !== 'ALL') && (
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
								<SelectItem value="PRE-SETTLED">Pre-Liquidado</SelectItem>
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
							Los contadores de cada archivo reflejan el total acumulado de
							todas las sincronizaciones realizadas.
						</p>
						{historial.map((carga) => {
							const { label: estadoLabel, style: estadoStyle } =
								getEstadoBadgeStyle(carga.estado)
							return (
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
														style={estadoStyle}
													>
														{estadoLabel}
													</span>
												</div>

												{/* Fecha, hora y usuario */}
												<p className="text-sm text-muted-foreground mb-3">
													{carga.fechaCarga}, {carga.horaCarga} • Por:{' '}
													{carga.usuario}
												</p>

												{/* Badges de estadísticas */}
												<div className="flex flex-wrap items-center gap-2">
													<StatBadge
														label="exitosos"
														value={carga.exitosos}
														bgColor="#dcfce7"
														textColor="#166534"
														borderColor="#86efac"
														dotColor="#16a34a"
													/>
													<StatBadge
														label="errores"
														value={carga.errores}
														bgColor="#fee2e2"
														textColor="#991b1b"
														borderColor="#fca5a5"
														dotColor="#dc2626"
													/>
													<StatBadge
														label="sincronizados"
														value={carga.sincronizados}
														bgColor="#dbeafe"
														textColor="#1e40af"
														borderColor="#93c5fd"
														dotColor="#3b82f6"
													/>
													<StatBadge
														label="sin registro"
														value={carga.sinRegistro}
														bgColor="#fef9c3"
														textColor="#854d0e"
														borderColor="#fde047"
														dotColor="#eab308"
													/>
													<StatBadge
														label="rezagados"
														value={carga.rezagados}
														bgColor="#fef3c7"
														textColor="#92400e"
														borderColor="#fcd34d"
														dotColor="#f59e0b"
													/>
												</div>
											</div>
										</div>

										{/* Botones Ver detalle, Preliquidar, Ir a Preliqui y Eliminar */}
										<div className="flex items-center gap-2">
											{carga.estado === 'LOAD' && (
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
											)}

											{carga.estado === 'PRE-SETTLED' && (
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														window.location.assign(`/dashboard/pre-liquidacion/${carga.idFileImport}`)
													}
													className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
												>
													IR a PRELIQUIDACIÓN
												</Button>
											)}

											{canPreliquidar &&
												carga.sincronizados > 0 &&
												carga.estado === 'LOAD' && (
													<Button
														variant="outline"
														size="sm"
														onClick={() => handlePreliquidarClick(carga)}
														disabled={preliquidarLoading[carga.id] === true}
														className="p-2"
														title="Pre-liquidar archivo"
													>
														{preliquidarLoading[carga.id] === true ? (
															<Loader2 className="h-4 w-4 mr-1 animate-spin" />
														) : null}
														Preliquidar
													</Button>
												)}

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
							)
						})}
					</div>
				)}
			</div>

			<ModalErroresConfiguracion
				registrosConError={registrosConError}
				open={modalErroresOpen}
				onClose={() => setModalErroresOpen(false)}
			/>

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
