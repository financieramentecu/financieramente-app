'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MisNegociosPage } from '@/features/negocios/components/MisNegociosPage'
import { BusinessViewModal } from '@/features/negocios/components/modals/BusinessViewModal'
import { BusinessCancelModal } from '@/features/negocios/components/modals/BusinessCancelModal'
import { businessService } from '@/features/negocios/services/business.service'
import { useBusinessMutation } from '@/features/negocios/hooks/use-business-mutation'
import { useBusinesses } from '@/features/negocios/hooks/use-businesses'
import { useBusinessStats } from '@/features/negocios/hooks/use-business-stats'
import { useDebounce } from '@/features/admin/users/hooks/use-debounce'
import { Business, StatsData } from '@/features/negocios/types/business.types'
import type { UserWithRole } from '@/features/negocios/types/business.types'
import type {
	BusinessEntity,
	BusinessStatus,
} from '@/features/negocios/types/business-entity.types'
import type { BusinessListParams } from '@/features/negocios/types/business-api.types'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-status.types'
import { formatCurrency } from '@/features/admin/currencies/lib/currency-formatters'
import { PiggyBank } from 'lucide-react'

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

	const { cancelBusiness, isCancelling, fondearBusiness } = useBusinessMutation()

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
	 * Fondea un negocio directamente (sin modal para negocios sin anualidades)
	 */
	const handleFondearBusiness = useCallback(
		async (business: Business) => {
			const result = await fondearBusiness(Number(business.id))

			if (result) {
				refetch()
				refetchStats()
			}
		},
		[fondearBusiness, refetch, refetchStats]
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
				date: b.createdAt,
				value: b.value,
				product: b.product.name,
				companyName: b.product.companyName,
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
		</div>
	)
}
