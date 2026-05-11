'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CategoriesTableSection } from '@/features/categories/components/categories-table'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { useCategoryMutations } from '@/features/categories/hooks/use-category-mutations'
import { useDebounce } from '@/features/admin/users/hooks/use-debounce'
import type { Category } from '@/features/categories/types/category.types'
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
 * Skeleton for the categories table
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
 * Client Component for Categories List Page
 */
export function CategoriesPageClient() {
	const router = useRouter()

	// State for search with debounce
	const [searchInput, setSearchInput] = useState('')
	const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_DELAY)

	// State for pagination
	const [page, setPage] = useState(1)
	const pageSize = 10

	// Track if table has initialized (loaded data at least once)
	const [hasInitialized, setHasInitialized] = useState(false)

	// Track last loaded search
	const [lastLoadedSearch, setLastLoadedSearch] = useState<string>('')

	// State for delete confirmation modal
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

	// Hook to get categories
	const { state, refetch } = useCategories({
		search: debouncedSearch || undefined,
		page,
		pageSize,
	})

	// Hook for mutations
	const { deleteCategory, deleteState } = useCategoryMutations()

	// Detect if debouncing (user typing)
	const isDebouncing = searchInput !== debouncedSearch

	// Detect if there's a pending search
	const hasPendingSearch = debouncedSearch !== (lastLoadedSearch ?? '')

	// Show loading if debouncing, loading, or pending search
	const isSearching =
		isDebouncing ||
		state.status === 'loading' ||
		hasPendingSearch

	// Mark as initialized and update last loaded values
	useEffect(() => {
		if (state.status === 'success') {
			if (!hasInitialized) {
				setHasInitialized(true)
			}
			setLastLoadedSearch(debouncedSearch)
		}
	}, [state.status, hasInitialized, debouncedSearch])

	// Handle search
	const handleSearch = useCallback((query: string) => {
		setSearchInput(query)
		setPage(1)
	}, [])

	// Handle page change
	const handlePageChange = useCallback((newPage: number) => {
		setPage(newPage)
	}, [])

	// Handle add new category
	const handleAddCategory = useCallback(() => {
		router.push('/dashboard/categorias/crear')
	}, [router])

	// Handle edit category
	const handleEditCategory = useCallback(
		(category: Category) => {
			router.push(`/dashboard/categorias/editar/${category.id}`)
		},
		[router]
	)

	// Handle delete category
	const handleDeleteCategory = useCallback((category: Category) => {
		setCategoryToDelete(category)
		setDeleteDialogOpen(true)
	}, [])

	// Confirm deletion
	const handleConfirmDelete = useCallback(async () => {
		if (!categoryToDelete) return

		await deleteCategory(categoryToDelete.id)
	}, [categoryToDelete, deleteCategory])

	// Handle delete state changes
	useEffect(() => {
		if (deleteState.status === 'success') {
			toast.success('Categoría desactivada exitosamente')
			setDeleteDialogOpen(false)
			setCategoryToDelete(null)
			refetch()
		} else if (deleteState.status === 'error') {
			toast.error(deleteState.error || 'Error al desactivar categoría')
		}
	}, [deleteState.status, deleteState.error, refetch])

	// Show full skeleton only on first load
	const showFullSkeleton = state.status === 'loading' && !hasInitialized

	// Show table loading when searching or loading (after initialized)
	const showTableLoading =
		isSearching ||
		(hasInitialized && state.status !== 'success' && state.status !== 'error')

	return (
		<div className="space-y-6">
			{/* Error Message */}
			{state.status === 'error' && <ErrorMessage message={state.error} />}

			{/* Categories Table Section */}
			{showFullSkeleton ? (
				<TableLoadingSkeleton />
			) : (
				<CategoriesTableSection
					data={state.status === 'success' ? state.data.categories : []}
					onAddCategory={handleAddCategory}
					onGlobalSearch={handleSearch}
					onEditCategory={handleEditCategory}
					onDeleteCategory={handleDeleteCategory}
					pagination={
						state.status === 'success' ? state.data.pagination : undefined
					}
					onPageChange={handlePageChange}
					isSearching={showTableLoading}
				/>
			)}

			{/* Delete confirmation modal */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Desactivar categoría?</AlertDialogTitle>
						<AlertDialogDescription>
							¿Está seguro de que desea desactivar la categoría{' '}
							<strong>{categoryToDelete?.name}</strong>? La categoría quedará
							inactiva pero no será eliminada permanentemente.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							disabled={deleteState.status === 'loading'}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteState.status === 'loading' ? 'Desactivando...' : 'Desactivar'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
