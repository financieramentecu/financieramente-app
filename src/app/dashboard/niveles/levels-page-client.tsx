'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LevelsTableSection } from '@/features/levels/components/levels-table'
import { useLevels } from '@/features/levels/hooks/use-levels'
import { useLevelMutations } from '@/features/levels/hooks/use-level-mutations'
import { useDebounce } from '@/features/admin/users/hooks/use-debounce'
import type { Level, LevelType } from '@/features/levels/types/level.types'
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
 * Skeleton for the levels table
 */
function TableLoadingSkeleton() {
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex justify-between items-center">
				<Skeleton className="h-7 w-52" />
				<div className="flex gap-2">
					<Skeleton className="h-10 w-40 rounded-md" />
					<Skeleton className="h-10 w-36 rounded-md" />
				</div>
			</div>

			{/* Search bar */}
			<Skeleton className="h-10 w-full max-w-sm rounded-md" />

			{/* Table */}
			<div className="border rounded-lg overflow-hidden">
				{/* Table header */}
				<div className="bg-muted/50 p-4 flex gap-4">
					{[80, 150, 100, 200, 80, 120, 100].map((w, i) => (
						<Skeleton key={i} className="h-4" style={{ width: w }} />
					))}
				</div>

				{/* Table rows */}
				{[1, 2, 3, 4, 5].map((row) => (
					<div key={row} className="p-4 flex gap-4 items-center border-t">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-6 w-20 rounded-full" />
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-6 w-16 rounded-full" />
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
 * Client Component for Levels List Page
 */
export function LevelsPageClient() {
	const router = useRouter()

	const [searchInput, setSearchInput] = useState('')
	const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_DELAY)

	const [selectedTypeLevel, setSelectedTypeLevel] = useState<
		LevelType | undefined
	>(undefined)

	const [page, setPage] = useState(1)
	const pageSize = 10

	const [hasInitialized, setHasInitialized] = useState(false)

	const [lastLoadedSearch, setLastLoadedSearch] = useState<string>('')
	const [lastLoadedTypeLevel, setLastLoadedTypeLevel] = useState<
		LevelType | undefined
	>(undefined)

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [levelToDelete, setLevelToDelete] = useState<Level | null>(null)

	const { state, refetch } = useLevels({
		search: debouncedSearch || undefined,
		typeLevel: selectedTypeLevel,
		page,
		pageSize,
	})

	const { deleteLevel, deleteState } = useLevelMutations()

	const isDebouncing = searchInput !== debouncedSearch
	const hasPendingSearch = debouncedSearch !== (lastLoadedSearch ?? '')
	const hasPendingTypeLevelChange =
		selectedTypeLevel !== (lastLoadedTypeLevel ?? undefined)

	const isSearching =
		isDebouncing ||
		state.status === 'loading' ||
		hasPendingSearch ||
		hasPendingTypeLevelChange

	useEffect(() => {
		if (state.status === 'success') {
			if (!hasInitialized) {
				setHasInitialized(true)
			}
			setLastLoadedSearch(debouncedSearch)
			setLastLoadedTypeLevel(selectedTypeLevel)
		}
	}, [state.status, hasInitialized, debouncedSearch, selectedTypeLevel])

	const handleSearch = useCallback((query: string) => {
		setSearchInput(query)
		setPage(1)
	}, [])

	const handleTypeLevelChange = useCallback((value: string) => {
		const typeLevel = value === 'all' ? undefined : (value as LevelType)
		setSelectedTypeLevel(typeLevel)
		setPage(1)
	}, [])

	const handlePageChange = useCallback((newPage: number) => {
		setPage(newPage)
	}, [])

	const handleAddLevel = useCallback(() => {
		router.push('/dashboard/niveles/crear')
	}, [router])

	const handleEditLevel = useCallback(
		(level: Level) => {
			router.push(`/dashboard/niveles/editar/${level.idLevel}`)
		},
		[router]
	)

	const handleDeleteLevel = useCallback((level: Level) => {
		setLevelToDelete(level)
		setDeleteDialogOpen(true)
	}, [])

	const handleConfirmDelete = useCallback(async () => {
		if (!levelToDelete) return
		await deleteLevel(levelToDelete.idLevel)
	}, [levelToDelete, deleteLevel])

	useEffect(() => {
		if (deleteState.status === 'success') {
			toast.success('Nivel eliminado exitosamente')
			setDeleteDialogOpen(false)
			setLevelToDelete(null)
			refetch()
		} else if (deleteState.status === 'error') {
			toast.error(deleteState.error || 'Error al eliminar nivel')
		}
	}, [deleteState.status, deleteState.error, refetch])

	const showFullSkeleton = state.status === 'loading' && !hasInitialized
	const showTableLoading =
		isSearching ||
		(hasInitialized && state.status !== 'success' && state.status !== 'error')

	return (
		<div className="space-y-6">
			{/* Error Message */}
			{state.status === 'error' && <ErrorMessage message={state.error} />}

			{/* Levels Table Section */}
			{showFullSkeleton ? (
				<TableLoadingSkeleton />
			) : (
				<LevelsTableSection
					data={state.status === 'success' ? state.data.levels : []}
					onAddLevel={handleAddLevel}
					onGlobalSearch={handleSearch}
					onEditLevel={handleEditLevel}
					onDeleteLevel={handleDeleteLevel}
					pagination={
						state.status === 'success' ? state.data.pagination : undefined
					}
					onPageChange={handlePageChange}
					isSearching={showTableLoading}
					selectedTypeLevel={selectedTypeLevel}
					onTypeLevelChange={handleTypeLevelChange}
				/>
			)}

			{/* Delete confirmation modal */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar nivel?</AlertDialogTitle>
						<AlertDialogDescription>
							¿Está seguro de que desea eliminar el nivel{' '}
							<strong>{levelToDelete?.name}</strong> (código:{' '}
							<strong>{levelToDelete?.code}</strong>)? Esta acción no se puede
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
