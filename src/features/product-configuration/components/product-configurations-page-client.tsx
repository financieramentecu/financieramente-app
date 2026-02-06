'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductConfigurationsTableSection } from './product-configurations-table'
import { useProductConfigurations } from '../hooks/use-product-configurations'
import { useProductConfigurationMutations } from '../hooks/use-product-configuration-mutations'
import { useDebounce } from '@/features/admin/users/hooks/use-debounce'
import type { ProductConfiguration } from '../types/product-configuration.types'
import { toast } from 'sonner'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { AlertCircle } from 'lucide-react'
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

/**
 * Skeleton for the product configurations table
 */
function TableLoadingSkeleton() {
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex justify-between items-center">
				<Skeleton className="h-7 w-64" />
				<div className="flex gap-2">
					<Skeleton className="h-10 w-44 rounded-md" />
				</div>
			</div>

			{/* Search bar */}
			<div className="flex gap-4">
				<Skeleton className="h-10 w-full max-w-sm rounded-md" />
				<Skeleton className="h-10 w-[180px] rounded-md" />
			</div>

			{/* Table */}
			<div className="border rounded-lg overflow-hidden">
				<div className="bg-muted/50 p-4 flex gap-4">
					{[80, 120, 100, 80, 80, 60, 80].map((w, i) => (
						<Skeleton
							key={i}
							className="h-4"
							style={{ width: w }}
						/>
					))}
				</div>
				{[1, 2, 3, 4, 5].map((row) => (
					<div
						key={row}
						className="p-4 flex gap-4 items-center border-t"
					>
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-6 w-16 rounded-full" />
						<div className="flex gap-1">
							<Skeleton className="h-8 w-8 rounded-md" />
							<Skeleton className="h-8 w-8 rounded-md" />
						</div>
					</div>
				))}
			</div>

			{/* Pagination */}
			<div className="flex justify-between items-center pt-2">
				<Skeleton className="h-4 w-32" />
				<div className="flex gap-2">
					<Skeleton className="h-8 w-20 rounded-md" />
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-8 w-20 rounded-md" />
				</div>
			</div>
		</div>
	)
}

/**
 * Error message component
 */
function ErrorMessage({ message }: { message: string }) {
	return (
		<div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
			<AlertCircle className="h-5 w-5" />
			<span>{message}</span>
		</div>
	)
}

/**
 * Client Component for Product Configurations List Page
 */
export function ProductConfigurationsPageClient() {
	const router = useRouter()

	// State for search with debounce
	const [searchInput, setSearchInput] = useState('')
	const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_DELAY)

	// State for active filter
	const [selectedActive, setSelectedActive] = useState<string | undefined>(
		undefined
	)

	// State for pagination
	const [page, setPage] = useState(1)
	const pageSize = 10

	// Track if table has initialized
	const [hasInitialized, setHasInitialized] = useState(false)

	// Track last loaded search and active filter
	const [lastLoadedSearch, setLastLoadedSearch] = useState<
		string | undefined
	>(undefined)
	const [lastLoadedActive, setLastLoadedActive] = useState<
		string | undefined
	>(undefined)

	// State for toggle active confirmation modal
	const [toggleDialogOpen, setToggleDialogOpen] = useState(false)
	const [configToToggle, setConfigToToggle] =
		useState<ProductConfiguration | null>(null)

	// Hook to get configurations
	const { state, refetch } = useProductConfigurations({
		search: debouncedSearch || undefined,
		active: selectedActive,
		page,
		pageSize,
	})

	// Hook for mutations
	const { toggleActive, toggleActiveState } =
		useProductConfigurationMutations()

	// Detect if debouncing
	const isDebouncing = searchInput !== debouncedSearch

	// Detect pending changes
	const hasPendingSearch = debouncedSearch !== (lastLoadedSearch ?? '')
	const hasPendingActiveChange =
		selectedActive !== (lastLoadedActive ?? undefined)

	// Show loading state
	const isSearching =
		isDebouncing ||
		state.status === 'loading' ||
		hasPendingSearch ||
		hasPendingActiveChange

	// Mark as initialized and update last loaded values
	useEffect(() => {
		if (state.status === 'success') {
			if (!hasInitialized) {
				setHasInitialized(true)
			}
			setLastLoadedSearch(debouncedSearch || undefined)
			setLastLoadedActive(selectedActive)
		}
	}, [state.status, hasInitialized, debouncedSearch, selectedActive])

	// Handle search
	const handleSearch = useCallback((query: string) => {
		setSearchInput(query)
		setPage(1)
	}, [])

	// Handle active filter change
	const handleActiveChange = useCallback((value: string) => {
		const active = value === 'all' ? undefined : value
		setSelectedActive(active)
		setPage(1)
	}, [])

	// Handle page change
	const handlePageChange = useCallback((newPage: number) => {
		setPage(newPage)
	}, [])

	// Handle add new configuration
	const handleAddConfiguration = useCallback(() => {
		router.push('/dashboard/configuraciones-producto/crear')
	}, [router])

	// Handle edit configuration
	const handleEditConfiguration = useCallback(
		(config: ProductConfiguration) => {
			router.push(
				`/dashboard/configuraciones-producto/editar/${config.id}`
			)
		},
		[router]
	)

	// Handle toggle active
	const handleToggleActive = useCallback(
		(config: ProductConfiguration) => {
			setConfigToToggle(config)
			setToggleDialogOpen(true)
		},
		[]
	)

	// Confirm toggle
	const handleConfirmToggle = useCallback(async () => {
		if (!configToToggle) return
		await toggleActive(configToToggle.id, !configToToggle.active)
	}, [configToToggle, toggleActive])

	// Handle toggle state changes
	useEffect(() => {
		if (toggleActiveState.status === 'success') {
			toast.success('Estado de configuración actualizado exitosamente')
			setToggleDialogOpen(false)
			setConfigToToggle(null)
			refetch()
		} else if (toggleActiveState.status === 'error') {
			toast.error(
				toggleActiveState.error ||
					'Error al cambiar estado de configuración'
			)
		}
	}, [toggleActiveState.status, toggleActiveState.error, refetch])

	// Show full skeleton only on first load
	const showFullSkeleton =
		state.status === 'loading' && !hasInitialized

	// Show table loading
	const showTableLoading =
		isSearching ||
		(hasInitialized &&
			state.status !== 'success' &&
			state.status !== 'error')

	return (
		<div className="space-y-6">
			{/* Error Message */}
			{state.status === 'error' && (
				<ErrorMessage message={state.error} />
			)}

			{/* Configurations Table Section */}
			{showFullSkeleton ? (
				<TableLoadingSkeleton />
			) : (
				<ProductConfigurationsTableSection
					data={
						state.status === 'success'
							? state.data.configurations
							: []
					}
					onAddConfiguration={handleAddConfiguration}
					onGlobalSearch={handleSearch}
					onEditConfiguration={handleEditConfiguration}
					onToggleActive={handleToggleActive}
					pagination={
						state.status === 'success'
							? state.data.pagination
							: undefined
					}
					onPageChange={handlePageChange}
					isSearching={showTableLoading}
					selectedActive={selectedActive}
					onActiveChange={handleActiveChange}
				/>
			)}

			{/* Toggle active confirmation modal */}
			<AlertDialog
				open={toggleDialogOpen}
				onOpenChange={setToggleDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{configToToggle?.active
								? '¿Desactivar configuración?'
								: '¿Activar configuración?'}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{configToToggle?.active
								? `¿Está seguro de que desea desactivar la configuración "${configToToggle?.code}"?`
								: `¿Está seguro de que desea activar la configuración "${configToToggle?.code}"?`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmToggle}
							disabled={
								toggleActiveState.status === 'loading'
							}
						>
							{toggleActiveState.status === 'loading'
								? 'Procesando...'
								: configToToggle?.active
									? 'Desactivar'
									: 'Activar'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
