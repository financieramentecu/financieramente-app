'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClientOriginsTableSection } from '@/features/origin-client/components/client-origins-table'
import { useClientOrigins } from '@/features/origin-client/hooks/use-client-origins'
import { useClientOriginMutations } from '@/features/origin-client/hooks/use-client-origin-mutations'
import { useDebounce } from '@/features/admin/users/hooks/use-debounce'
import type { ClientOrigin } from '@/features/origin-client/types/client-origin.types'
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
 * Skeleton para la tabla de orígenes de cliente
 */
function TableLoadingSkeleton() {
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex justify-between items-center">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-10 w-40 rounded-md" />
			</div>

			{/* Search bar */}
			<Skeleton className="h-10 w-full max-w-sm rounded-md" />

			{/* Table */}
			<div className="border rounded-lg overflow-hidden">
				{/* Table header */}
				<div className="bg-muted/50 p-4 flex gap-4">
					{[80, 200, 150, 100, 120, 120, 100].map((w, i) => (
						<Skeleton key={i} className="h-4" style={{ width: w }} />
					))}
				</div>

				{/* Table rows */}
				{[1, 2, 3, 4, 5].map((row) => (
					<div key={row} className="p-4 flex gap-4 items-center border-t">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-6 w-20 rounded-full" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-24" />
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
 * Componente de mensaje de error
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
 * Componente Cliente para la Página de Listado de Orígenes de Cliente
 */
export function OrigenesPageClient() {
	const router = useRouter()

	// Estado para búsqueda con debounce
	const [searchInput, setSearchInput] = useState('')
	const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_DELAY)

	// Estado para paginación
	const [page, setPage] = useState(1)
	const pageSize = 10

	// Trackear si la tabla ya se inicializó (cargó datos al menos una vez)
	const [hasInitialized, setHasInitialized] = useState(false)

	// Trackear el último término de búsqueda que se cargó exitosamente
	const [lastLoadedSearch, setLastLoadedSearch] = useState<string | undefined>(
		undefined
	)

	// Estado para modal de confirmación de eliminación
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [originToDelete, setOriginToDelete] = useState<ClientOrigin | null>(
		null
	)

	// Hook para obtener orígenes
	const { state, refetch } = useClientOrigins({
		search: debouncedSearch || undefined,
		page,
		pageSize,
	})

	// Hook para mutaciones
	const { deleteClientOrigin, deleteState } = useClientOriginMutations()

	// Detectar si se está esperando el debounce (usuario escribiendo)
	const isDebouncing = searchInput !== debouncedSearch

	// Detectar si hay una búsqueda pendiente (el término actual no coincide con lo cargado)
	const hasPendingSearch = debouncedSearch !== (lastLoadedSearch ?? '')

	// Mostrar loading si está debouncing, cargando, o hay búsqueda pendiente
	const isSearching =
		isDebouncing || state.status === 'loading' || hasPendingSearch

	// Marcar como inicializado y actualizar último término cargado
	useEffect(() => {
		if (state.status === 'success') {
			if (!hasInitialized) {
				setHasInitialized(true)
			}
			// Actualizar el último término de búsqueda que se cargó
			setLastLoadedSearch(debouncedSearch || undefined)
		}
	}, [state.status, hasInitialized, debouncedSearch])

	// Manejar búsqueda
	const handleSearch = useCallback((query: string) => {
		setSearchInput(query)
		setPage(1) // Resetear a primera página al buscar
	}, [])

	// Manejar cambio de página
	const handlePageChange = useCallback((newPage: number) => {
		setPage(newPage)
	}, [])

	// Manejar agregar nuevo origen
	const handleAddOrigin = useCallback(() => {
		router.push('/dashboard/origenes/crear')
	}, [router])

	// Manejar editar origen
	const handleEditOrigin = useCallback(
		(origin: ClientOrigin) => {
			router.push(`/dashboard/origenes/editar/${origin.idClientOrigin}`)
		},
		[router]
	)

	// Manejar eliminar origen
	const handleDeleteOrigin = useCallback((origin: ClientOrigin) => {
		setOriginToDelete(origin)
		setDeleteDialogOpen(true)
	}, [])

	// Confirmar eliminación
	const handleConfirmDelete = useCallback(async () => {
		if (!originToDelete) return

		await deleteClientOrigin(originToDelete.idClientOrigin)

		if (deleteState.status === 'success') {
			toast.success('Origen de cliente eliminado exitosamente')
			setDeleteDialogOpen(false)
			setOriginToDelete(null)
			refetch()
		} else if (deleteState.status === 'error') {
			toast.error(deleteState.error || 'Error al eliminar origen de cliente')
		}
	}, [originToDelete, deleteClientOrigin, deleteState, refetch])

	// Refetch cuando cambia el estado de eliminación
	useEffect(() => {
		if (deleteState.status === 'success') {
			refetch()
		}
	}, [deleteState.status, refetch])

	// Una vez inicializado, nunca mostrar el skeleton completo de nuevo
	const showFullSkeleton = state.status === 'loading' && !hasInitialized

	// Mostrar loading en la tabla cuando se está buscando o cargando (después de inicializado)
	const showTableLoading =
		isSearching ||
		(hasInitialized && state.status !== 'success' && state.status !== 'error')

	return (
		<div className="space-y-6">
			{/* Error Message */}
			{state.status === 'error' && <ErrorMessage message={state.error} />}

			{/* Client Origins Table Section */}
			{showFullSkeleton ? (
				<TableLoadingSkeleton />
			) : (
				<ClientOriginsTableSection
					data={state.status === 'success' ? state.data.origins : []}
					onAddOrigin={handleAddOrigin}
					onGlobalSearch={handleSearch}
					onEditOrigin={handleEditOrigin}
					onDeleteOrigin={handleDeleteOrigin}
					pagination={
						state.status === 'success' ? state.data.pagination : undefined
					}
					onPageChange={handlePageChange}
					isSearching={showTableLoading}
				/>
			)}

			{/* Modal de confirmación de eliminación */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar origen de cliente?</AlertDialogTitle>
						<AlertDialogDescription>
							¿Está seguro de que desea eliminar el origen{' '}
							<strong>{originToDelete?.name}</strong>? Esta acción no se puede
							deshacer.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							disabled={deleteState.status === 'loading'}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteState.status === 'loading' ? 'Eliminando...' : 'Eliminar'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

