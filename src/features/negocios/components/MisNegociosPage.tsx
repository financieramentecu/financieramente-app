'use client'

import React from 'react'
import { StatsOverview } from '@/features/negocios/components/StatsOverview'
import { BusinessTableSection } from '@/features/negocios/components/BusinessTableSection'
import { Business, StatsData } from '@/features/negocios/types/business.types'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { TableLoadingSkeleton } from '@/features/shared/ui/loading-skeletons'
import { AlertCircle } from 'lucide-react'
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import { UserRole } from '@/features/auth/lib/roles'

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
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
			{[1, 2, 3].map((i) => (
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
					userRole={user?.role ?? undefined}
				/>
			)}
		</div>
	)
}

// Export default para cumplir con PagesPageConfig de Next.js
export default MisNegociosPage
