'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MisNegociosPage } from '@/features/negocios/components/MisNegociosPage'
import { BusinessViewModal } from '@/features/negocios/components/modals/BusinessViewModal'
import { BusinessCancelModal } from '@/features/negocios/components/modals/BusinessCancelModal'
import { AnnualFundingModal } from '@/features/negocios/components/modals/AnnualFundingModal'
import { businessService } from '@/features/negocios/services/business.service'
import { useBusinessMutation } from '@/features/negocios/hooks/use-business-mutation'
import { useBusinesses } from '@/features/negocios/hooks/use-businesses'
import { useBusinessExport } from '@/features/negocios/hooks/use-business-export'
import { useBusinessStats } from '@/features/negocios/hooks/use-business-stats'
import { UserRole } from '@/features/auth/lib/roles'
import { useDebounce } from '@/features/admin/users/hooks/use-debounce'
import { Business, StatsData } from '@/features/negocios/types/business.types'
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
import { BUSINESS_STATUS } from '@/features/negocios/types/business-status.types'
import { formatCurrency } from '@/features/admin/currencies/lib/currency-formatters'
import { PiggyBank } from 'lucide-react'
import { toast } from 'sonner'

const SEARCH_DEBOUNCE_DELAY = 500
const DEFAULT_CURRENCY = 'COP'

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
	const [annualFundingLoading, setAnnualFundingLoading] = useState(false)

	// Estado para currency seleccionada
	const [selectedCurrency, setSelectedCurrency] =
		useState<string>(DEFAULT_CURRENCY)

	// Estado para búsqueda con debounce
	const [searchInput, setSearchInput] = useState('')
	const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_DELAY)

	// Estado para paginación
	const [searchParams, setSearchParams] = useState<BusinessListParams>({
		page: 1,
		pageSize: 10,
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
			page: 1,
		}))
	}, [debouncedSearch])

	// Hooks para datos
	const { businesses, isLoading, error, pagination, refetch } =
		useBusinesses(searchParams)

	// Detectar si se está esperando el debounce (usuario escribiendo)
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
	} = useBusinessStats()

	// Actualizar currency seleccionada cuando los stats se cargan por primera vez
	useEffect(() => {
		if (stats?.currencies && stats.currencies.length > 0) {
			// Si la currency seleccionada no existe en los datos, usar la primera disponible
			const currencyExists = stats.currencies.some(
				(c) => c.symbol === selectedCurrency
			)
			if (!currencyExists) {
				setSelectedCurrency(stats.currencies[0].symbol)
			}
		}
	}, [stats?.currencies, selectedCurrency])

	const {
		cancelBusiness,
		isCancelling,
		fondearBusiness,
		fondearAnualidadesBusiness,
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

	// Handler para cambio de currency
	const handleCurrencyChange = useCallback((currency: string) => {
		setSelectedCurrency(currency)
	}, [])

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
	const handleFondearBusiness = useCallback(
		async (business: Business) => {
			if (business.hasAnnualPayments) {
				setAnnualFundingBusinessId(Number(business.id))
				setAnnualFundingContract(
					typeof business.contract === 'string' ? business.contract : null
				)
				setAnnualFundingOpen(true)
				setAnnualFundingLoading(true)
				setAnnualFundingInstallments([])

				const res = await businessService.getAnnualPayments(
					Number(business.id)
				)
				setAnnualFundingLoading(false)

				if ('error' in res && res.error) {
					toast.error('No se pudieron cargar las anualidades', {
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

	const handleAnnualFundingOpenChange = useCallback((open: boolean) => {
		setAnnualFundingOpen(open)
		if (!open) {
			setAnnualFundingBusinessId(null)
			setAnnualFundingContract(null)
			setAnnualFundingInstallments([])
		}
	}, [])

	const handleConfirmAnnualFunding = useCallback(
		async (fundedInstallmentIndexes: number[]) => {
			if (annualFundingBusinessId === null) return

			const result = await fondearAnualidadesBusiness(
				annualFundingBusinessId,
				{ fundedInstallmentIndexes }
			)

			if (result) {
				setAnnualFundingOpen(false)
				setAnnualFundingBusinessId(null)
				setAnnualFundingContract(null)
				setAnnualFundingInstallments([])
				refetch()
				refetchStats()
			}
		},
		[
			annualFundingBusinessId,
			fondearAnualidadesBusiness,
			refetch,
			refetchStats,
		]
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

	const handleFundDateFromChange = useCallback((value: string) => {
		if (!value) {
			setSearchParams((prev) => ({
				...prev,
				dateFrom: undefined,
				dateTo: undefined,
				page: 1,
			}))
			return
		}
		setSearchParams((prev) => ({
			...prev,
			dateFrom: value,
			page: 1,
		}))
	}, [])

	const handleFundDateToChange = useCallback((value: string) => {
		if (!value) {
			setSearchParams((prev) => ({
				...prev,
				dateFrom: undefined,
				dateTo: undefined,
				page: 1,
			}))
			return
		}
		setSearchParams((prev) => ({
			...prev,
			dateTo: value,
			page: 1,
		}))
	}, [])

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

	// Convertir BusinessEntity[] a Business[] para compatibilidad con componentes existentes
	const businessDataForTable: Business[] = useMemo(
		() =>
			businesses.map((b) => ({
				id: String(b.id),
				identification: b.client.identityNumber,
				clientName: b.client.fullName,
				contract: b.contract || '-',
				user: {
					avatar: '',
					name: b.agent.fullName,
				},
				email: b.client.email || '',
				termPeriod: `${b.term || 0}/${b.periodicity?.name || ''}`,
				term: b.term,
				periodicityName: b.periodicity?.name ?? null,
				dateIssued: b.dateIssued,
				dateAnchored: b.dateAnchored,
				date: b.createdAt,
				value: b.value,
				product: b.product.name,
				companyName: b.product.companyName,
				clientOriginName: b.clientOrigin.name,
				status:
					b.status === BUSINESS_STATUS.EMITIDO
						? 'Emitido'
						: b.status === BUSINESS_STATUS.VENTA_EFECTUADA
							? 'Venta Efectuado'
							: b.status === BUSINESS_STATUS.COMISIONANDO
								? 'Comisionando'
								: b.status === BUSINESS_STATUS.FONDEADO
									? 'Fondeado'
									: 'Cancelado',
				hasAnnualPayments: b.hasAnnualPayments,
				hasPendingAnnualFunding: b.hasPendingAnnualFunding,
				currency: b.currency,
			})),
		[businesses]
	)

	// Convertir stats a formato esperado por StatsOverview (agrupado por currency)
	const statsDataForDisplay: StatsData[] = useMemo(() => {
		if (!stats) return []

		// Obtener stats para la currency seleccionada
		const efectuadosStats = stats.efectuados[selectedCurrency]
		const emitidosStats = stats.emitidos[selectedCurrency]

		// Si no hay stats para la currency, usar valores por defecto
		const defaultStats = {
			totalValue: 0,
			totalMonth: 0,
			totalLastMonth: 0,
			monthlyData: [],
			growthPercentage: 0,
		}

		const efectuados = efectuadosStats || defaultStats
		const emitidos = emitidosStats || defaultStats

		return [
			{
				title: 'Resumen Negocios Efectuados',
				value: formatCurrency(efectuados.totalMonth, selectedCurrency),
				change: Number(efectuados.growthPercentage.toFixed(2)),
				trend:
					efectuados.growthPercentage >= 0
						? ('up' as const)
						: ('down' as const),
				description: `Último mes: ${formatCurrency(efectuados.totalLastMonth, selectedCurrency)}`,
				monthlyData: efectuados.monthlyData.map((m) => m.totalValue),
				currencies: stats.currencies,
				selectedCurrency,
				onCurrencyChange: handleCurrencyChange,
			},
			{
				title: 'Total Negocios Emitidos',
				value: formatCurrency(emitidos.totalMonth, selectedCurrency),
				change: Number(emitidos.growthPercentage.toFixed(2)),
				trend:
					emitidos.growthPercentage >= 0 ? ('up' as const) : ('down' as const),
				description: `Último mes: ${formatCurrency(emitidos.totalLastMonth, selectedCurrency)}`,
				monthlyData: emitidos.monthlyData.map((m) => m.totalValue),
				currencies: stats.currencies,
				selectedCurrency,
				onCurrencyChange: handleCurrencyChange,
			},
			{
				title: 'Reserva de Clawback',
				value: formatCurrency(stats.clawbackBalance || 0, selectedCurrency),
				change: 0,
				trend: 'up' as const,
				description: 'Saldo acumulado',
				icon: <PiggyBank className="h-5 w-5" />,
				variant: 'amber' as const,
				monthlyData: [],
				currencies: stats.currencies,
				selectedCurrency,
				onCurrencyChange: handleCurrencyChange,
			},
		]
	}, [stats, selectedCurrency, handleCurrencyChange])

	// Combinar errores de negocios y estadísticas
	const displayError = error || statsError

	return (
		<div className="space-y-6">
			{/* Contenido de la página de negocios */}
			<MisNegociosPage
				businessData={businessDataForTable}
				statsData={statsDataForDisplay}
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
				listStatus={searchParams.status}
				onListStatusChange={handleListStatusChange}
				fundDateFrom={searchParams.dateFrom ?? ''}
				fundDateTo={searchParams.dateTo ?? ''}
				onFundDateFromChange={handleFundDateFromChange}
				onFundDateToChange={handleFundDateToChange}
				canExportExcel={canExportExcel}
				onExportExcel={handleExportExcel}
				isExportingExcel={isExportingExcel}
				exportExcelError={exportExcelError}
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

			<AnnualFundingModal
				open={annualFundingOpen}
				onOpenChange={handleAnnualFundingOpenChange}
				businessId={annualFundingBusinessId}
				contractLabel={annualFundingContract}
				installments={annualFundingInstallments}
				isLoadingInstallments={annualFundingLoading}
				isSubmitting={isFondeandoAnualidades}
				onConfirm={handleConfirmAnnualFunding}
			/>
		</div>
	)
}
