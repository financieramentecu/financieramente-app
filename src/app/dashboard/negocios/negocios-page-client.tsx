'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MisNegociosPage from '@/features/negocios/components/MisNegociosPage'
import { BusinessViewModal } from '@/features/negocios/components/modals/BusinessViewModal'
import { BusinessCancelModal } from '@/features/negocios/components/modals/BusinessCancelModal'
import { FundingModal } from '@/features/negocios/components/modals/FundingModal'
import { businessService } from '@/features/negocios/services/business.service'
import { useBusinessMutation } from '@/features/negocios/hooks/use-business-mutation'
import { useBusinesses } from '@/features/negocios/hooks/use-businesses'
import { useBusinessExport } from '@/features/negocios/hooks/use-business-export'
import { useBusinessStats } from '@/features/negocios/hooks/use-business-stats'
import { UserRole, canFundPayments } from '@/features/auth/lib/roles'
import { useDebounce } from '@/features/admin/users/hooks/use-debounce'
import { Business } from '@/features/negocios/types/business.types'
import type { UserWithRole } from '@/features/negocios/types/business.types'
import type {
	BusinessEntity,
	BusinessStatus,
} from '@/features/negocios/types/business-entity.types'
import type {
	AnnualInstallmentDto,
	BusinessListParams,
	NegociosExportBody,
} from '@/features/negocios/types/business-api.types'
import { mapBusinessToTableRow } from '@/features/negocios/lib/map-business-to-table-row'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/features/shared/ui/alert-dialog'

const SEARCH_DEBOUNCE_DELAY = 500

interface NegociosPageClientProps {
	currentUser?: UserWithRole
}

/**
 * Componente Cliente para la Página de Negocios
 *
 * Maneja el estado y las interacciones del usuario
 */
export function NegociosPageClient({
	currentUser: _currentUser,
}: NegociosPageClientProps) {
	const router = useRouter()

	const isAgentRole = _currentUser?.role?.code === UserRole.AGENTE

	// Estado para modales
	const [viewModalOpen, setViewModalOpen] = useState(false)
	const [cancelModalOpen, setCancelModalOpen] = useState(false)
	const [selectedBusiness, setSelectedBusiness] =
		useState<BusinessEntity | null>(null)
	const [isLoadingBusiness, setIsLoadingBusiness] = useState(false)

	const [annualFundingOpen, setAnnualFundingOpen] = useState(false)
	const [annualFundingBusinessId, setAnnualFundingBusinessId] = useState<
		number | null
	>(null)
	const [annualFundingInstallments, setAnnualFundingInstallments] = useState<
		AnnualInstallmentDto[]
	>([])
	const [annualFundingContract, setAnnualFundingContract] = useState<
		string | null
	>(null)
	const [annualFundingPeriodicidadLabel, setAnnualFundingPeriodicidadLabel] =
		useState<string | null>(null)
	const [annualFundingPlazo, setAnnualFundingPlazo] = useState<number | null>(
		null
	)
	const [annualFundingLoading, setAnnualFundingLoading] = useState(false)
	const [fondearConfirmOpen, setFondearConfirmOpen] = useState(false)
	const [pendingFondearBusiness, setPendingFondearBusiness] =
		useState<Business | null>(null)
	const [isConfirmingFondear, setIsConfirmingFondear] = useState(false)

	// Estado para búsqueda con debounce
	const [searchInput, setSearchInput] = useState('')
	const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_DELAY)

	const [agentNameInput, setAgentNameInput] = useState('')
	const debouncedAgentName = useDebounce(agentNameInput, SEARCH_DEBOUNCE_DELAY)

	// Fechas por defecto para el Coach (Mes actual)
	const defaultDates = useMemo(() => {
		const now = new Date()
		const year = now.getFullYear()
		const month = String(now.getMonth() + 1).padStart(2, '0')
		const day = String(now.getDate()).padStart(2, '0')
		return {
			from: `${year}-${month}-01`,
			to: `${year}-${month}-${day}`,
		}
	}, [])

	// Estado para paginación
	// Sin dateFrom/dateTo por defecto: el listado muestra todos los negocios;
	// los KPI de stats usan las fechas del picker o el rango por defecto.
	const [searchParams, setSearchParams] = useState<BusinessListParams>({
		page: 1,
		pageSize: 10,
		...(isAgentRole ? { dateFrom: defaultDates.from, dateTo: defaultDates.to } : {}),
	})

	// Trackear si la tabla ya se inicializó (cargó datos al menos una vez)
	const [hasInitialized, setHasInitialized] = useState(false)

	// Trackear el último término de búsqueda que se cargó exitosamente
	const [lastLoadedSearch, setLastLoadedSearch] = useState<string | undefined>(
		undefined
	)

	// Actualizar searchParams cuando cambia el valor debounceado
	useEffect(() => {
		setSearchParams((prev) => ({
			...prev,
			search: debouncedSearch || undefined,
			agentName: debouncedAgentName || undefined,
			page: 1,
		}))
	}, [debouncedSearch, debouncedAgentName])

	// Para Coach: mapear dateFrom/dateTo a createdFrom/createdTo en el listado
	const listParams: BusinessListParams = isAgentRole
		? {
				...searchParams,
				dateFrom: undefined,
				dateTo: undefined,
				createdFrom: searchParams.dateFrom,
				createdTo: searchParams.dateTo,
			}
		: searchParams

	// Hooks para datos
	const { businesses, isLoading, error, pagination, refetch } =
		useBusinesses(listParams)

	const isDebouncing = searchInput !== debouncedSearch || agentNameInput !== debouncedAgentName

	// Detectar si hay una búsqueda pendiente (el término actual no coincide con lo cargado)
	const hasPendingSearch = debouncedSearch !== (lastLoadedSearch ?? '')

	// Mostrar loading si está debouncing, cargando, o hay búsqueda pendiente
	const isSearching = isDebouncing || isLoading || hasPendingSearch

	// Marcar como inicializado y actualizar último término cargado
	useEffect(() => {
		if (!isLoading) {
			if (!hasInitialized) {
				setHasInitialized(true)
			}
			// Actualizar el último término de búsqueda que se cargó
			setLastLoadedSearch(searchParams.search ?? '')
		}
	}, [isLoading, hasInitialized, searchParams.search])

	const {
		stats,
		isLoading: isLoadingStats,
		error: statsError,
		refetch: refetchStats,
	} = useBusinessStats({
		dateFrom: searchParams.dateFrom || defaultDates.from,
		dateTo: searchParams.dateTo || defaultDates.to,
	})

	const {
		cancelBusiness,
		isCancelling,
		fondearBusiness,
		fondearAnualidadesBusiness,
		isFondeando,
		isFondeandoAnualidades,
	} = useBusinessMutation()

	const {
		exportReport,
		isExporting: isExportingExcel,
		error: exportExcelError,
	} = useBusinessExport()

	const canExportExcel =
		_currentUser?.role?.code === UserRole.ADMIN ||
		_currentUser?.role?.code === UserRole.ASISTENTE_GERENCIA_OPERATIVA ||
		_currentUser?.role?.code === UserRole.ANALISTA_SOPORTE

	// Handlers
	const handleAddBusiness = useCallback(() => {
		router.push('/dashboard/negocios/crear')
	}, [router])

	/**
	 * Navega a la página de edición
	 */
	const handleEditBusiness = useCallback(
		(business: Business) => {
			router.push(`/dashboard/negocios/editar/${business.id}`)
		},
		[router]
	)

	/**
	 * Abre el modal de visualización con el negocio seleccionado
	 */
	const handleViewBusiness = useCallback(async (business: Business) => {
		setIsLoadingBusiness(true)
		setViewModalOpen(true)

		try {
			const response = await businessService.getById(Number(business.id))
			if (response.data) {
				setSelectedBusiness(response.data)
			}
		} catch (err) {
			console.error('Error al cargar negocio:', err)
		} finally {
			setIsLoadingBusiness(false)
		}
	}, [])

	/**
	 * Abre el modal de cancelación con el negocio seleccionado
	 */
	const handleCancelBusiness = useCallback(async (business: Business) => {
		setIsLoadingBusiness(true)
		setCancelModalOpen(true)

		try {
			const response = await businessService.getById(Number(business.id))
			if (response.data) {
				setSelectedBusiness(response.data)
			}
		} catch (err) {
			console.error('Error al cargar negocio:', err)
		} finally {
			setIsLoadingBusiness(false)
		}
	}, [])

	/**
	 * Fondeo: sin anualidades → POST directo; con anualidades → modal HU4
	 */
	const executeFondearBusiness = useCallback(
		async (business: Business) => {
			if (business.hasPayments) {
				setAnnualFundingBusinessId(Number(business.id))
				setAnnualFundingContract(
					typeof business.contract === 'string' ? business.contract : null
				)
				setAnnualFundingPeriodicidadLabel(business.periodicityName ?? null)
				setAnnualFundingPlazo(typeof business.term === 'number' ? business.term : null)
				setAnnualFundingOpen(true)
				setAnnualFundingLoading(true)
				setAnnualFundingInstallments([])

				const res = await businessService.getAnnualPayments(Number(business.id))
				setAnnualFundingLoading(false)

				if ('error' in res && res.error) {
					toast.error('No se pudieron cargar los aportes', {
						description: res.error,
					})
					setAnnualFundingOpen(false)
					setAnnualFundingBusinessId(null)
					setAnnualFundingContract(null)
					return
				}

				if (res.data) {
					setAnnualFundingInstallments(res.data.installments)
				}
				return
			}

			const result = await fondearBusiness(Number(business.id))

			if (result) {
				refetch()
				refetchStats()
			}
		},
		[fondearBusiness, refetch, refetchStats]
	)

	const handleFondearBusiness = useCallback(
		(business: Business) => {
			if (business.hasPayments) {
				void executeFondearBusiness(business)
				return
			}

			setPendingFondearBusiness(business)
			setFondearConfirmOpen(true)
		},
		[executeFondearBusiness]
	)

	const handleConfirmFondear = useCallback(async () => {
		if (!pendingFondearBusiness) return
		setIsConfirmingFondear(true)
		try {
			await executeFondearBusiness(pendingFondearBusiness)
			setFondearConfirmOpen(false)
			setPendingFondearBusiness(null)
		} finally {
			setIsConfirmingFondear(false)
		}
	}, [pendingFondearBusiness, executeFondearBusiness])

	const handleFondearConfirmOpenChange = useCallback(
		(open: boolean) => {
			if (isConfirmingFondear) {
				return
			}
			setFondearConfirmOpen(open)
			if (!open) {
				setPendingFondearBusiness(null)
			}
		},
		[isConfirmingFondear]
	)

	const handleAnnualFundingOpenChange = useCallback((open: boolean) => {
		setAnnualFundingOpen(open)
		if (!open) {
			setAnnualFundingBusinessId(null)
			setAnnualFundingContract(null)
			setAnnualFundingPeriodicidadLabel(null)
			setAnnualFundingPlazo(null)
			setAnnualFundingInstallments([])
		}
	}, [])

	const handleConfirmAnnualFunding = useCallback(
		async (fundedInstallmentIndexes: number[]) => {
			if (annualFundingBusinessId === null) return

			const result = await fondearAnualidadesBusiness(annualFundingBusinessId, {
				fundedInstallmentIndexes,
			})

			if (result) {
				setAnnualFundingOpen(false)
				setAnnualFundingBusinessId(null)
				setAnnualFundingContract(null)
				setAnnualFundingInstallments([])
				refetch()
				refetchStats()
			}
		},
		[annualFundingBusinessId, fondearAnualidadesBusiness, refetch, refetchStats]
	)

	/**
	 * Confirma la cancelación del negocio
	 */
	const handleConfirmCancel = useCallback(
		async (reason: string) => {
			if (!selectedBusiness) return

			const result = await cancelBusiness(selectedBusiness.id, { reason })

			if (result) {
				setCancelModalOpen(false)
				setSelectedBusiness(null)
				// Refrescar lista de negocios y estadísticas
				refetch()
				refetchStats()
			}
		},
		[selectedBusiness, cancelBusiness, refetch, refetchStats]
	)

	/**
	 * Maneja la búsqueda global con debounce
	 * Actualiza el input de búsqueda, el debounce se encarga del resto
	 */
	const handleGlobalSearch = useCallback((query: string) => {
		setSearchInput(query)
	}, [])

	/**
	 * Cambia de página en la tabla
	 */
	const handlePageChange = useCallback((page: number) => {
		setSearchParams((prev) => ({ ...prev, page }))
	}, [])

	const handlePageSizeChange = useCallback((pageSize: number) => {
		setSearchParams((prev) => ({ ...prev, pageSize, page: 1 }))
	}, [])

	const handleListStatusChange = useCallback(
		(status: BusinessStatus | undefined) => {
			setSearchParams((prev) => ({
				...prev,
				status,
				page: 1,
			}))
		},
		[]
	)

	const handleAgentNameChange = useCallback(
		(agentName: string) => {
			setAgentNameInput(agentName)
		},
		[]
	)

	const handleSortingChange = useCallback(
		(sortBy: string | undefined, sortOrder: 'asc' | 'desc') => {
			setSearchParams((prev) => ({
				...prev,
				sortBy,
				sortOrder,
				page: 1,
			}))
		},
		[]
	)

	const handleFundDateFromChange = useCallback((value: string) => {
		setSearchParams((prev) => {
			const newFrom = isAgentRole ? (value || defaultDates.from) : (value || undefined)
			const newTo = prev.dateTo ?? (isAgentRole ? defaultDates.to : undefined)
			const next: BusinessListParams = { ...prev, dateFrom: newFrom, dateTo: newTo, page: 1 }
			if (!isAgentRole) {
				next.status = (newFrom && newTo) ? 'FONDEADO' : undefined
			}
			return next
		})
	}, [isAgentRole, defaultDates.from, defaultDates.to])

	const handleFundDateToChange = useCallback((value: string) => {
		setSearchParams((prev) => {
			const newTo = isAgentRole ? (value || defaultDates.to) : (value || undefined)
			const newFrom = prev.dateFrom ?? (isAgentRole ? defaultDates.from : undefined)
			const next: BusinessListParams = { ...prev, dateTo: newTo, dateFrom: newFrom, page: 1 }
			if (!isAgentRole) {
				next.status = (newFrom && newTo) ? 'FONDEADO' : undefined
			}
			return next
		})
	}, [isAgentRole, defaultDates.from, defaultDates.to])

	const handleExportExcel = useCallback(async () => {
		const df = searchParams.dateFrom
		const dt = searchParams.dateTo
		const body: NegociosExportBody = {
			search: debouncedSearch || undefined,
			status: searchParams.status,
		}
		if (df && dt) {
			body.dateFrom = df
			body.dateTo = dt
		}
		const result = await exportReport(body)
		if (result.ok) {
			toast.success('Archivo descargado')
		} else {
			toast.error(result.error ?? 'No se pudo exportar')
		}
	}, [
		exportReport,
		searchParams.dateFrom,
		searchParams.dateTo,
		searchParams.status,
		debouncedSearch,
	])

	// Limpiar business seleccionado al cerrar modales
	const handleViewModalClose = useCallback((open: boolean) => {
		setViewModalOpen(open)
		if (!open) {
			setSelectedBusiness(null)
		}
	}, [])

	const handleCancelModalClose = useCallback((open: boolean) => {
		setCancelModalOpen(open)
		if (!open) {
			setSelectedBusiness(null)
		}
	}, [])

	const businessDataForTable: Business[] = useMemo(
		() => businesses.map(mapBusinessToTableRow),
		[businesses]
	)

	// Rango de fondeo activo (no-agente con ambas fechas): bloquea el selector de estado
	const isFundDateRangeActive = !isAgentRole && Boolean(searchParams.dateFrom && searchParams.dateTo)

	// Combinar errores de negocios y estadísticas
	const displayError = error || statsError

	return (
		<div className="flex flex-col flex-1 min-h-0 gap-4 overflow-hidden">
			{/* Contenido de la página de negocios */}
			<MisNegociosPage
				businessData={businessDataForTable}
				stats={stats || undefined}
				isLoading={isLoading}
				isLoadingStats={isLoadingStats}
				isSearching={isSearching}
				hasInitialized={hasInitialized}
				error={displayError}
				pagination={pagination}
				onAddBusiness={handleAddBusiness}
				onEditBusiness={handleEditBusiness}
				onViewBusiness={handleViewBusiness}
				onCancelBusiness={handleCancelBusiness}
				onFondearBusiness={handleFondearBusiness}
				onGlobalSearch={handleGlobalSearch}
				onPageChange={handlePageChange}
				onPageSizeChange={handlePageSizeChange}
				listStatus={searchParams.status}
				onListStatusChange={handleListStatusChange}
				agentName={agentNameInput}
				onAgentNameChange={handleAgentNameChange}
				fundDateFrom={searchParams.dateFrom ?? (isAgentRole ? defaultDates.from : '')}
				fundDateTo={searchParams.dateTo ?? (isAgentRole ? defaultDates.to : '')}
				fundDateRangeActive={isFundDateRangeActive}
				onFundDateFromChange={handleFundDateFromChange}
				onFundDateToChange={handleFundDateToChange}
				canExportExcel={canExportExcel}
				onExportExcel={handleExportExcel}
				isExportingExcel={isExportingExcel}
				exportExcelError={exportExcelError}
				onSortingChange={handleSortingChange}
				sortBy={searchParams.sortBy}
				sortOrder={searchParams.sortOrder}
				onUploadSuccess={() => { refetch(); refetchStats() }}
				onDeleteSuccess={() => { refetch(); refetchStats() }}
			/>

			{/* Modal de Visualización */}
			<BusinessViewModal
				open={viewModalOpen}
				onOpenChange={handleViewModalClose}
				business={selectedBusiness}
				isLoading={isLoadingBusiness}
			/>

			{/* Modal de Cancelación */}
			<BusinessCancelModal
				open={cancelModalOpen}
				onOpenChange={handleCancelModalClose}
				business={selectedBusiness}
				isLoading={isCancelling || isLoadingBusiness}
				onConfirm={handleConfirmCancel}
			/>

			<FundingModal
				open={annualFundingOpen}
				onOpenChange={handleAnnualFundingOpenChange}
				businessId={annualFundingBusinessId}
				contractLabel={annualFundingContract}
				installments={annualFundingInstallments}
				isLoadingInstallments={annualFundingLoading}
				isSubmitting={isFondeandoAnualidades}
				periodicidadLabel={annualFundingPeriodicidadLabel}
				plazo={annualFundingPlazo}
				canFund={canFundPayments(_currentUser?.role?.code)}
				onConfirm={handleConfirmAnnualFunding}
			/>

			<AlertDialog
				open={fondearConfirmOpen}
				onOpenChange={handleFondearConfirmOpenChange}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Confirmar fondeo?</AlertDialogTitle>
						<AlertDialogDescription>
							{pendingFondearBusiness?.hasPayments
								? 'Se abrirá el flujo para seleccionar y confirmar aportes a fondear.'
								: 'Esta acción registrará el fondeo del negocio, ¿Desea continuar?'}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							disabled={
								isConfirmingFondear || isFondeando || isFondeandoAnualidades
							}
						>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault()
								void handleConfirmFondear()
							}}
							disabled={
								isConfirmingFondear || isFondeando || isFondeandoAnualidades
							}
						>
							{isConfirmingFondear ? (
								<span className="inline-flex items-center gap-2">
									<Loader2 className="h-4 w-4 animate-spin" />
									Procesando...
								</span>
							) : (
								'Confirmar'
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
