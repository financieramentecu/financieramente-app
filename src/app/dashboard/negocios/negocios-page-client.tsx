'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useRouter, useSearchParams as useNextSearchParams } from 'next/navigation'
import MisNegociosPage from '@/features/negocios/components/MisNegociosPage'
import { BusinessCancelModal } from '@/features/negocios/components/modals/BusinessCancelModal'
import { BusinessObservationsModal } from '@/features/negocios/components/modals/BusinessObservationsModal'
import { FundingModal } from '@/features/negocios/components/modals/FundingModal'
import { FundDirectFundingModal } from '@/features/negocios/components/modals/FundDirectFundingModal'
import { businessService } from '@/features/negocios/services/business.service'
import { useBusinessMutation } from '@/features/negocios/hooks/use-business-mutation'
import { useBusinesses } from '@/features/negocios/hooks/use-businesses'
import { useBusinessExport } from '@/features/negocios/hooks/use-business-export'
import { useBusinessStats } from '@/features/negocios/hooks/use-business-stats'
import { canExportBusinessList } from '@/features/negocios/lib/can-export-business-list'
import { useDebounce } from '@/features/admin/users/hooks/use-debounce'
import { Business } from '@/features/negocios/types/business.types'
import type { UserWithRole } from '@/features/negocios/types/business.types'
import type {
	BusinessEntity,
	BusinessStatus,
	NovedadFilterValue,
} from '@/features/negocios/types/business-entity.types'
import type {
	AnnualInstallmentDto,
	BusinessListParams,
	NegociosExportBody,
} from '@/features/negocios/types/business-api.types'
import { mapBusinessToTableRow } from '@/features/negocios/lib/map-business-to-table-row'
import {
	getCurrentMonthRange,
	getDefaultDateParamPair,
	hasAnyDateParam,
} from '@/features/negocios/lib/default-date-filter'
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
	/** Initial searchParams from the server component (for SSR hydration) */
	initialSearchParams?: Record<string, string | string[] | undefined>
}

/**
 * Componente Cliente para la Página de Negocios
 *
 * Maneja el estado y las interacciones del usuario
 */
export function NegociosPageClient({
	currentUser: _currentUser,
	initialSearchParams: _initialSearchParams,
}: NegociosPageClientProps) {
	const router = useRouter()
	const urlSearchParams = useNextSearchParams()

	// Derive filter params from URL search params (written by AdvancedFiltersSheet)
	const urlFilterParams: Partial<BusinessListParams> = useMemo(() => {
		const statuses = urlSearchParams.getAll('statuses') as BusinessStatus[]
		const companyIds = urlSearchParams.getAll('companyIds').map(Number).filter(n => !isNaN(n))
		const productIds = urlSearchParams.getAll('productIds').map(Number).filter(n => !isNaN(n))
		const originIds = urlSearchParams.getAll('originIds').map(Number).filter(n => !isNaN(n))
		const terms = urlSearchParams.getAll('terms').map(Number).filter(n => !isNaN(n))
		const periodicityIds = urlSearchParams.getAll('periodicityIds').map(Number).filter(n => !isNaN(n))
		const agentCategoryIds = urlSearchParams.getAll('agentCategoryIds').map(Number).filter(n => !isNaN(n))
		const agentIds = urlSearchParams.getAll('agentIds').map(Number).filter(n => !isNaN(n))
		const novedadStatuses = urlSearchParams.getAll('novedadStatuses') as NovedadFilterValue[]
		const hasSupportsParam = urlSearchParams.get('hasSupports')
		const hasSupports = hasSupportsParam === 'true' ? true : hasSupportsParam === 'false' ? false : undefined
		const agentNameFromUrl = urlSearchParams.get('agentName') ?? undefined

		return {
			statuses: statuses.length > 0 ? statuses : undefined,
			dateFrom: urlSearchParams.get('dateFrom') ?? undefined,
			dateTo: urlSearchParams.get('dateTo') ?? undefined,
			createdFrom: urlSearchParams.get('createdFrom') ?? undefined,
			createdTo: urlSearchParams.get('createdTo') ?? undefined,
			dateIssuedFrom: urlSearchParams.get('dateIssuedFrom') ?? undefined,
			dateIssuedTo: urlSearchParams.get('dateIssuedTo') ?? undefined,
			agentName: agentNameFromUrl,
			hasSupports,
			companyIds: companyIds.length > 0 ? companyIds : undefined,
			productIds: productIds.length > 0 ? productIds : undefined,
			originIds: originIds.length > 0 ? originIds : undefined,
			terms: terms.length > 0 ? terms : undefined,
			periodicityIds: periodicityIds.length > 0 ? periodicityIds : undefined,
			agentCategoryIds: agentCategoryIds.length > 0 ? agentCategoryIds : undefined,
			agentIds: agentIds.length > 0 ? agentIds : undefined,
			novedadStatuses: novedadStatuses.length > 0 ? novedadStatuses : undefined,
		}
	}, [urlSearchParams])

	// Estado para modales
	const [cancelModalOpen, setCancelModalOpen] = useState(false)
	const [observationsModalOpen, setObservationsModalOpen] = useState(false)
	const [observationsBusiness, setObservationsBusiness] = useState<Business | null>(null)
	const [selectedBusiness, setSelectedBusiness] =
		useState<BusinessEntity | null>(null)
	const [isLoadingBusiness, setIsLoadingBusiness] = useState(false)

	const [annualFundingOpen, setAnnualFundingOpen] = useState(false)
	const [annualFundingBusinessId, setAnnualFundingBusinessId] = useState<
		number | null
	>(null)
	const [annualFundingBusinessStatus, setAnnualFundingBusinessStatus] = useState<
		string | null
	>(null)
	const [annualFundingDateAnchored, setAnnualFundingDateAnchored] = useState<
		string | null
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
	const [fundDirectModalOpen, setFundDirectModalOpen] = useState(false)
	const [fundDirectError, setFundDirectError] = useState<string | null>(null)

	// Estado para búsqueda con debounce
	const [searchInput, setSearchInput] = useState('')
	const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_DELAY)

	// Fechas por defecto para el Coach (Mes actual)
	const defaultDates = useMemo(() => getCurrentMonthRange(), [])

	// Estado para paginación
	// Sin dateFrom/dateTo por defecto: el listado muestra todos los negocios;
	// los KPI de stats usan las fechas del picker o el rango por defecto.
	const [searchParams, setSearchParams] = useState<BusinessListParams>({
		page: 1,
		pageSize: 10,
		companyIds: [],
		productIds: [],
		originIds: [],
	})

	// Seed the role's default date filter (current month on creation date) into
	// the URL once per mount, so the AdvancedFiltersSheet and the active-filter
	// badge reflect it. Skips when the URL already carries a date filter.
	// "Limpiar filtros" in AdvancedFiltersSheet re-seeds the current month
	// itself (this effect does not run again after the first mount seed).
	const defaultDatePair = getDefaultDateParamPair(_currentUser?.role?.code)
	const hasSeededDefaultDateRef = useRef(false)
	useEffect(() => {
		if (!defaultDatePair || hasSeededDefaultDateRef.current) return
		hasSeededDefaultDateRef.current = true
		if (hasAnyDateParam(urlSearchParams)) return
		const params = new URLSearchParams(urlSearchParams.toString())
		params.set(defaultDatePair.fromKey, defaultDates.from)
		params.set(defaultDatePair.toKey, defaultDates.to)
		router.replace(`?${params.toString()}`, { scroll: false })
	}, [defaultDatePair, urlSearchParams, router, defaultDates])

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
			page: 1,
		}))
	}, [debouncedSearch])

	// Reset the local page back to 1 whenever an AdvancedFiltersSheet/URL filter
	// dimension changes. `page` lives in local state, separate from the URL —
	// without this, applying a filter while on page 2+ keeps the stale page
	// number, which can request an offset beyond the (smaller) filtered result
	// set and silently return zero rows even though matching data exists.
	useEffect(() => {
		setSearchParams((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }))
	}, [urlFilterParams])

	// Merge URL filter params (from AdvancedFiltersSheet) into listParams
	const mergedParams: BusinessListParams = useMemo(() => ({
		...searchParams,
		// URL params take precedence for filter dimensions
		...(urlFilterParams.statuses ? { statuses: urlFilterParams.statuses } : {}),
		...(urlFilterParams.dateFrom ? { dateFrom: urlFilterParams.dateFrom } : {}),
		...(urlFilterParams.dateTo ? { dateTo: urlFilterParams.dateTo } : {}),
		...(urlFilterParams.createdFrom ? { createdFrom: urlFilterParams.createdFrom } : {}),
		...(urlFilterParams.createdTo ? { createdTo: urlFilterParams.createdTo } : {}),
		...(urlFilterParams.dateIssuedFrom ? { dateIssuedFrom: urlFilterParams.dateIssuedFrom } : {}),
		...(urlFilterParams.dateIssuedTo ? { dateIssuedTo: urlFilterParams.dateIssuedTo } : {}),
		...(urlFilterParams.agentName ? { agentName: urlFilterParams.agentName } : {}),
		...(urlFilterParams.hasSupports !== undefined ? { hasSupports: urlFilterParams.hasSupports } : {}),
		...(urlFilterParams.companyIds ? { companyIds: urlFilterParams.companyIds } : {}),
		...(urlFilterParams.productIds ? { productIds: urlFilterParams.productIds } : {}),
		...(urlFilterParams.originIds ? { originIds: urlFilterParams.originIds } : {}),
		...(urlFilterParams.terms ? { terms: urlFilterParams.terms } : {}),
		...(urlFilterParams.periodicityIds ? { periodicityIds: urlFilterParams.periodicityIds } : {}),
		...(urlFilterParams.agentCategoryIds ? { agentCategoryIds: urlFilterParams.agentCategoryIds } : {}),
		...(urlFilterParams.agentIds ? { agentIds: urlFilterParams.agentIds } : {}),
		...(urlFilterParams.novedadStatuses ? { novedadStatuses: urlFilterParams.novedadStatuses } : {}),
	}), [searchParams, urlFilterParams])

	// Each URL date pair filters its own DB column (dateFrom/dateTo → dateAnchored,
	// createdFrom/createdTo → createdAt, dateIssuedFrom/dateIssuedTo → dateIssued)
	// with no role-based remapping.
	const { businesses, isLoading, error, pagination, refetch } =
		useBusinesses(mergedParams)

	const isDebouncing = searchInput !== debouncedSearch

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
	} = useBusinessStats(urlFilterParams)

	const {
		cancelBusiness,
		isCancelling,
		fondearBusiness,
		isFondeando,
		isFondeandoAnualidades,
	} = useBusinessMutation()

	const {
		exportReport,
		isExporting: isExportingExcel,
		error: exportExcelError,
	} = useBusinessExport()

	const canExportExcel = canExportBusinessList({
		roleCode: _currentUser?.role?.code,
		levelCode: _currentUser?.level?.code,
	})

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
	 * Redirige a la ruta de detalle del negocio
	 */
	const handleViewBusiness = useCallback((business: Business) => {
		router.push(`/dashboard/negocios/${business.id}`)
	}, [router])

	/**
	 * Abre el modal de cancelación con el negocio seleccionado
	 */
	const handleCancelBusiness = useCallback(async (business: Business) => {
		// Set immediately from row data so the modal never closes due to null business
		setSelectedBusiness(business as unknown as BusinessEntity)
		setCancelModalOpen(true)

		// Enrich with full data in the background
		try {
			setIsLoadingBusiness(true)
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
		async (business: Business, fundedDate?: string) => {
			if (business.hasPayments) {
				setAnnualFundingBusinessId(Number(business.id))
				setAnnualFundingBusinessStatus(business.status ?? null)
				setAnnualFundingDateAnchored(typeof business.dateAnchored === 'string' ? business.dateAnchored : null)
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

			const result = await fondearBusiness(Number(business.id), fundedDate)

			if (result) {
				refetch(true)
				refetchStats(true)
			}

			return result
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

			if (business.numAportes === 0) {
				setFundDirectError(null)
				setFundDirectModalOpen(true)
				return
			}

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

	const handleFundDirectModalOpenChange = useCallback(
		(open: boolean) => {
			if (isFondeando) {
				return
			}
			setFundDirectModalOpen(open)
			if (!open) {
				setPendingFondearBusiness(null)
				setFundDirectError(null)
			}
		},
		[isFondeando]
	)

	const handleConfirmFundDirect = useCallback(
		async (fundedDate: string) => {
			if (!pendingFondearBusiness) return
			setFundDirectError(null)
			const result = await executeFondearBusiness(
				pendingFondearBusiness,
				fundedDate
			)
			if (result) {
				setFundDirectModalOpen(false)
				setPendingFondearBusiness(null)
			}
		},
		[pendingFondearBusiness, executeFondearBusiness]
	)

	const handleRefetchAnnualPayments = useCallback(async () => {
		if (!annualFundingBusinessId) return
		setAnnualFundingLoading(true)
		const res = await businessService.getAnnualPayments(annualFundingBusinessId)
		setAnnualFundingLoading(false)
		if (res.data) {
			setAnnualFundingInstallments(res.data.installments)
		}
	}, [annualFundingBusinessId])

	const handleAnnualFundingOpenChange = useCallback((open: boolean) => {
		setAnnualFundingOpen(open)
		if (!open) {
			setAnnualFundingBusinessId(null)
			setAnnualFundingBusinessStatus(null)
			setAnnualFundingDateAnchored(null)
			setAnnualFundingContract(null)
			setAnnualFundingPeriodicidadLabel(null)
			setAnnualFundingPlazo(null)
			setAnnualFundingInstallments([])
		}
	}, [])

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
				refetch(true)
				refetchStats(true)
			}
		},
		[selectedBusiness, cancelBusiness, refetch, refetchStats]
	)

	const handleViewObservations = useCallback((business: Business) => {
		setObservationsBusiness(business)
		setObservationsModalOpen(true)
	}, [])

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

	const handleExportExcel = useCallback(async () => {
		// Export uses all current filter params (list and URL-based) for parity
		const body: NegociosExportBody = {
			search: debouncedSearch || undefined,
			status: searchParams.status,
			statuses: urlFilterParams.statuses,
			dateFrom: mergedParams.dateFrom,
			dateTo: mergedParams.dateTo,
			createdFrom: mergedParams.createdFrom,
			createdTo: mergedParams.createdTo,
			dateIssuedFrom: mergedParams.dateIssuedFrom,
			dateIssuedTo: mergedParams.dateIssuedTo,
			agentName: urlFilterParams.agentName,
			hasSupports: urlFilterParams.hasSupports,
			companyIds: mergedParams.companyIds,
			productIds: mergedParams.productIds,
			originIds: mergedParams.originIds,
			terms: urlFilterParams.terms,
			periodicityIds: urlFilterParams.periodicityIds,
			agentCategoryIds: urlFilterParams.agentCategoryIds,
			agentIds: urlFilterParams.agentIds,
			novedadStatuses: urlFilterParams.novedadStatuses,
		}
		const result = await exportReport(body)
		if (result.ok) {
			toast.success('Archivo descargado')
		} else {
			toast.error(result.error ?? 'No se pudo exportar')
		}
	}, [
		exportReport,
		searchParams.status,
		debouncedSearch,
		urlFilterParams,
		mergedParams,
	])

	// Limpiar business seleccionado al cerrar modales
	const handleCancelModalClose = useCallback((open: boolean) => {
		setCancelModalOpen(open)
		if (!open) {
			setSelectedBusiness(null)
		}
	}, [])

	const handleSaveDateIssued = useCallback(async (businessId: number, dateIssued: string) => {
		const response = await businessService.update(businessId, { dateIssued })
		if ('error' in response && response.error) {
			throw new Error(response.error)
		}
		if (response.data) {
			setSelectedBusiness(response.data)
		}
		toast.success('La fecha de emisión fue actualizada exitosamente. Los fondeos han sido recalculados')
		refetch(true)
		refetchStats(true)
	}, [refetch, refetchStats])

	const handleSaveDateAnchored = useCallback(async (businessId: number, dateAnchored: string) => {
		const response = await businessService.updateDateAnchored(businessId, dateAnchored)
		if ('error' in response && response.error) {
			throw new Error(response.error)
		}
		if (response.data) {
			setSelectedBusiness(response.data)
		}
		toast.success('La fecha de fondeo fue actualizada exitosamente')
		refetch(true)
		refetchStats(true)
	}, [refetch, refetchStats])

	const handleMarkNovedad = useCallback(async (business: Business) => {
		const response = await businessService.markNovedad(Number(business.id), 'MARK')
		if ('error' in response && response.error) {
			toast.error('No se pudo marcar la novedad', {
				description: response.error,
			})
			return
		}
		toast.success('Negocio marcado con novedad')
		refetch(true)
	}, [refetch])

	const handleUnmarkNovedad = useCallback(async (business: Business) => {
		const response = await businessService.markNovedad(Number(business.id), 'UNMARK')
		if ('error' in response && response.error) {
			toast.error('No se pudo desmarcar la novedad', {
				description: response.error,
			})
			return
		}
		toast.success('Novedad desmarcada')
		refetch(true)
	}, [refetch])

	// El toast de confirmación y la llamada PATCH ya los maneja BusinessRowActions
	// (abre su propio BusinessNovedadManageModal); aquí solo se refresca la lista.
	const handleManageNovedadSuccess = useCallback(() => {
		refetch(true)
	}, [refetch])

	const businessDataForTable: Business[] = useMemo(
		() => businesses.map(mapBusinessToTableRow),
		[businesses]
	)

	// Combinar errores de negocios y estadísticas
	const displayError = error || statsError

	return (
		<div className="flex flex-col min-h-0 gap-4 overflow-visible h-auto">
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
				onViewObservations={handleViewObservations}
				onFondearBusiness={handleFondearBusiness}
				onGlobalSearch={handleGlobalSearch}
				onPageChange={handlePageChange}
				onPageSizeChange={handlePageSizeChange}
				canExportExcel={canExportExcel}
				onExportExcel={handleExportExcel}
				isExportingExcel={isExportingExcel}
				exportExcelError={exportExcelError}
				onSortingChange={handleSortingChange}
				sortBy={searchParams.sortBy}
				sortOrder={searchParams.sortOrder}
				onUploadSuccess={() => { refetch(true); refetchStats(true) }}
				onDeleteSuccess={() => { refetch(true); refetchStats(true) }}
				onSaveDateIssued={handleSaveDateIssued}
				onSaveDateAnchored={handleSaveDateAnchored}
				onMarkNovedad={handleMarkNovedad}
				onUnmarkNovedad={handleUnmarkNovedad}
				onManageNovedadSuccess={handleManageNovedadSuccess}
			/>

			{/* Modal de Cancelación */}
			<BusinessObservationsModal
				open={observationsModalOpen}
				onOpenChange={setObservationsModalOpen}
				businessId={Number(observationsBusiness?.id)}
				contract={observationsBusiness?.contract ?? null}
				observations={(observationsBusiness?.observations as string | null) ?? null}
			/>

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
				periodicidadLabel={annualFundingPeriodicidadLabel}
				plazo={annualFundingPlazo}
				roleCode={_currentUser?.role?.code}
				businessStatus={annualFundingBusinessStatus ?? undefined}
				dateAnchored={annualFundingDateAnchored}
				onRefetchInstallments={handleRefetchAnnualPayments}
				onFundingSuccess={() => { refetch(); refetchStats() }}
			/>

			<FundDirectFundingModal
				open={fundDirectModalOpen}
				onOpenChange={handleFundDirectModalOpenChange}
				business={pendingFondearBusiness}
				onConfirm={(fundedDate) => void handleConfirmFundDirect(fundedDate)}
				isLoading={isFondeando}
				error={fundDirectError}
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
