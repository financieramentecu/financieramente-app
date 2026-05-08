'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CompaniesTableSection } from '@/features/company/components/companies-table'
import { useCompanies } from '@/features/company/hooks/use-companies'
import { useCompanyMutations } from '@/features/company/hooks/use-company-mutations'
import { useDebounce } from '@/features/admin/users/hooks/use-debounce'
import type { Company } from '@/features/company/types/company.types'
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

function TableLoadingSkeleton() {
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex justify-between items-center">
				<Skeleton className="h-7 w-44" />
				<Skeleton className="h-10 w-40 rounded-md" />
			</div>

			{/* Search bar */}
			<Skeleton className="h-10 w-full max-w-sm rounded-md" />

			{/* Table */}
			<div className="border rounded-lg overflow-hidden">
				<div className="bg-muted/50 p-4 flex gap-4">
					{[80, 200, 100, 120, 100].map((w, i) => (
						<Skeleton key={i} className="h-4" style={{ width: w }} />
					))}
				</div>

				{[1, 2, 3, 4, 5].map((row) => (
					<div key={row} className="p-4 flex gap-4 items-center border-t">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-6 w-20 rounded-full" />
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

function ErrorMessage({ message }: { message: string }) {
	return (
		<div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
			<AlertCircle className="h-5 w-5" />
			<span>{message}</span>
		</div>
	)
}

/**
 * Client Component for Companies List Page
 */
export function CompaniesPageClient() {
	const router = useRouter()

	const [searchInput, setSearchInput] = useState('')
	const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_DELAY)

	const [page, setPage] = useState(1)
	const pageSize = 10

	const [hasInitialized, setHasInitialized] = useState(false)
	const [lastLoadedSearch, setLastLoadedSearch] = useState<string | undefined>(
		undefined
	)

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)

	const { state, refetch } = useCompanies({
		search: debouncedSearch || undefined,
		page,
		pageSize,
	})

	const { deleteCompany, deleteState } = useCompanyMutations()

	const isDebouncing = searchInput !== debouncedSearch
	const hasPendingSearch = debouncedSearch !== (lastLoadedSearch ?? '')
	const isSearching =
		isDebouncing || state.status === 'loading' || hasPendingSearch

	useEffect(() => {
		if (state.status === 'success') {
			if (!hasInitialized) {
				setHasInitialized(true)
			}
			setLastLoadedSearch(debouncedSearch || undefined)
		}
	}, [state.status, hasInitialized, debouncedSearch])

	const handleSearch = useCallback((query: string) => {
		setSearchInput(query)
		setPage(1)
	}, [])

	const handlePageChange = useCallback((newPage: number) => {
		setPage(newPage)
	}, [])

	const handleAddCompany = useCallback(() => {
		router.push('/dashboard/admin/companies/create')
	}, [router])

	const handleEditCompany = useCallback(
		(company: Company) => {
			router.push(`/dashboard/admin/companies/edit/${company.idCompany}`)
		},
		[router]
	)

	const handleDeleteCompany = useCallback((company: Company) => {
		setCompanyToDelete(company)
		setDeleteDialogOpen(true)
	}, [])

	const handleConfirmDelete = useCallback(async () => {
		if (!companyToDelete) return

		const response = await deleteCompany(companyToDelete.idCompany)

		if ('error' in response) {
			toast.error(response.error || 'Error al eliminar empresa')
		} else {
			toast.success('Empresa eliminada exitosamente')
			setDeleteDialogOpen(false)
			setCompanyToDelete(null)
			refetch()
		}
	}, [companyToDelete, deleteCompany, refetch])


	const showFullSkeleton = state.status === 'loading' && !hasInitialized

	const showTableLoading =
		isSearching ||
		(hasInitialized && state.status !== 'success' && state.status !== 'error')

	return (
		<div className="space-y-6">
			{state.status === 'error' && <ErrorMessage message={state.error} />}

			{showFullSkeleton ? (
				<TableLoadingSkeleton />
			) : (
				<CompaniesTableSection
					data={state.status === 'success' ? state.data.companies : []}
					onAddCompany={handleAddCompany}
					onGlobalSearch={handleSearch}
					onEditCompany={handleEditCompany}
					onDeleteCompany={handleDeleteCompany}
					pagination={
						state.status === 'success' ? state.data.pagination : undefined
					}
					onPageChange={handlePageChange}
					isSearching={showTableLoading}
				/>
			)}

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar empresa?</AlertDialogTitle>
						<AlertDialogDescription>
							¿Está seguro de que desea eliminar la empresa{' '}
							<strong>{companyToDelete?.name}</strong>? Esta acción no se puede
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
