'use client'

import React from 'react'
import { StatsOverview } from '@/features/negocios/components/StatsOverview'
import { BusinessTableSection } from '@/features/negocios/components/BusinessTableSection'
import { Business, StatsData } from '@/features/negocios/types/business.types'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import { UserRole } from '@/lib/auth/roles'

interface PaginationData {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

interface MisNegociosPageProps {
	businessData?: Business[]
	statsData?: StatsData[]
	isLoading?: boolean
	isLoadingStats?: boolean
	isSearching?: boolean
	hasInitialized?: boolean
	error?: string | null
	pagination?: PaginationData
	onAddBusiness?: () => void
	onEditBusiness?: (business: Business) => void
	onViewBusiness?: (business: Business) => void
	onCancelBusiness?: (business: Business) => void
	onGlobalSearch?: (query: string) => void
	onPageChange?: (page: number) => void
}

function StatsLoadingSkeleton() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
			{[1, 2].map((i) => (
				<div
					key={i}
					className="p-6 rounded-xl border bg-card shadow-sm space-y-4"
				>
					<div className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-5 w-48" />
					</div>
					<div className="flex items-end justify-between">
						<div className="space-y-2">
							<Skeleton className="h-10 w-28" />
							<Skeleton className="h-4 w-16" />
						</div>
						<Skeleton className="h-12 w-24 rounded-lg" />
					</div>
				</div>
			))}
		</div>
	)
}

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
				{/* Table header */}
				<div className="bg-muted/50 p-4 flex gap-4">
					{[80, 100, 120, 150, 80, 100, 100, 80, 80].map((w, i) => (
						<Skeleton key={i} className="h-4" style={{ width: w }} />
					))}
				</div>

				{/* Table rows */}
				{[1, 2, 3, 4, 5].map((row) => (
					<div key={row} className="p-4 flex gap-4 items-center border-t">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-24" />
						<div className="flex items-center gap-2">
							<Skeleton className="h-8 w-8 rounded-full" />
							<Skeleton className="h-4 w-28" />
						</div>
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-6 w-20 rounded-full" />
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
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
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

export function MisNegociosPage({
	businessData = [],
	statsData = [],
	isLoading = false,
	isLoadingStats = false,
	isSearching = false,
	hasInitialized = false,
	error = null,
	pagination,
	onAddBusiness = () => {},
	onEditBusiness = () => {},
	onViewBusiness,
	onCancelBusiness,
	onGlobalSearch = () => {},
	onPageChange,
}: MisNegociosPageProps) {
	const { user } = useAuthSession()
	const isAgentUser = user?.role === UserRole.AGENTE

	// Una vez inicializado, nunca mostrar el skeleton completo de nuevo
	const showFullSkeleton = isLoading && !hasInitialized

	// Mostrar loading en la tabla cuando se está buscando o cargando (después de inicializado)
	const showTableLoading = isSearching || (isLoading && hasInitialized)

	return (
		<div className="space-y-8">
			{/* Stats Overview - Solo visible para agentes */}
			{isAgentUser &&
				(isLoadingStats ? (
					<StatsLoadingSkeleton />
				) : (
					<StatsOverview statsData={statsData} />
				))}

			{/* Error Message */}
			{error && <ErrorMessage message={error} />}

			{/* Business Table Section */}
			{showFullSkeleton ? (
				<TableLoadingSkeleton />
			) : (
				<BusinessTableSection
					data={businessData}
					onAddBusiness={onAddBusiness}
					onGlobalSearch={onGlobalSearch}
					onEditBusiness={onEditBusiness}
					onViewBusiness={onViewBusiness}
					onCancelBusiness={onCancelBusiness}
					pagination={pagination}
					onPageChange={onPageChange}
					isSearching={showTableLoading}
				/>
			)}
		</div>
	)
}

// Export default para cumplir con PagesPageConfig de Next.js
export default MisNegociosPage
