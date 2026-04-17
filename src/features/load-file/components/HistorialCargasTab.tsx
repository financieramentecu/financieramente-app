'use client'
import React, { useState, useEffect } from 'react'

import {
	FileText,
	RefreshCw,
	AlertCircle,
	Search,
	X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
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
import { useFileHistory, type CargaHistorial } from '../hooks/use-file-history'
import { ConfirmModal, Modal } from '@/features/shared/ui/modal'
import { RecordsByStatusView } from './RecordsByStatusView'
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import { ROLE_PERMISSIONS } from '@/features/auth/lib/permissions'
import type { UserRole } from '@/features/auth/lib/roles'
import { FileImportCard } from './FileImportCard'
import type { FileImportStatus } from './ui/FileStatusBadge'

/**
 * Componente para mostrar el historial de cargas de archivos
 */

export interface HistorialCargasTabProps {
	readonly allowedStatuses: FileImportStatus[]
	readonly title?: string
	readonly canDeleteFn?: (carga: CargaHistorial) => boolean
	readonly emptyStateDescription?: string
	readonly showPreliquidarAction?: boolean
	readonly onGoToLiquidacion?: () => void
}

const defaultCanDeleteFn = (carga: CargaHistorial): boolean =>
	carga.estado === 'LOAD'

export function HistorialCargasTab({
	allowedStatuses,
	title = 'Historial de Cargas',
	canDeleteFn = defaultCanDeleteFn,
	emptyStateDescription,
	showPreliquidarAction = true,
	onGoToLiquidacion,
}: HistorialCargasTabProps) {
	const router = useRouter()
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

	// Filter States
	const [searchTerm, setSearchTerm] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)
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
		statuses: allowedStatuses,
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
		setMesFilter('ALL')
		setAnioFilter('ALL')
	}


	const handleGoToPreliquidacion = (idFileImport: number) => {
		router.push(`/dashboard/pre-liquidacion/${idFileImport}`)
	}

	const hasActiveFilters =
		Boolean(searchTerm) || mesFilter !== 'ALL' || anioFilter !== 'ALL'

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
						<RecordsByStatusView fileImportId={detailFileImportId} compact />
					</div>
				)}
			</Modal>

			{/* Panel de Filtros */}
			<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
				{hasActiveFilters && (
					<div className="flex items-center justify-between mb-4">
						<Button
							variant="ghost"
							size="sm"
							onClick={handleClearFilters}
							className="text-muted-foreground hover:text-foreground h-8"
							aria-label="Limpiar filtros"
						>
							<X className="h-3.5 w-3.5 mr-1" /> Limpiar filtros
						</Button>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Buscador */}
					<div className="space-y-2">
						<Label className="text-xs">Buscar</Label>
						<div className="relative">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Buscar por nombre de archivo..."
								className="pl-9"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
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

			{/* Sección de En proceso */}
			<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
				{/* Header con título y botón recargar */}
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-2">
						<h2 className="text-lg font-semibold text-primary">
							{title}
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
						title="No hay archivos en proceso disponible"
						description={emptyStateDescription}
					/>
				) : (
					<div className="space-y-4">
						<p className="text-xs text-muted-foreground">
							Los contadores de cada archivo reflejan el total acumulado de
							todas las sincronizaciones realizadas.
						</p>
						{historial.map((carga) => (
							<FileImportCard
								key={carga.id}
								carga={carga}
								canDelete={canDeleteFn(carga)}
								canPreliquidar={
									showPreliquidarAction &&
									canPreliquidar &&
									carga.sincronizados > 0 &&
									carga.estado === 'LOAD'
								}
								onDelete={handleDeleteClick}
								onViewDetail={setDetailFileImportId}
								onGoToPreliquidacion={handleGoToPreliquidacion}
								onGoToLiquidacion={onGoToLiquidacion}
							/>
						))}
					</div>
				)}
			</div>


		</div>
	)
}
