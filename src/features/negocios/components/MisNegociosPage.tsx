'use client'

import React, { useState } from 'react'
import { StatsOverview } from '@/features/negocios/components/StatsOverview'
import { BusinessTableSection } from '@/features/negocios/components/BusinessTableSection'
import { Business } from '@/features/negocios/types/business.types'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { TableLoadingSkeleton } from '@/features/shared/ui/loading-skeletons'
import { AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import { Button } from '@/features/shared/ui/button'

interface PaginationData {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

import { CoachKpiResponse } from '@/features/negocios/types/business-api.types'

export interface MisNegociosPageProps {
	businessData?: Business[]
	stats?: CoachKpiResponse | null
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
	onViewObservations?: (business: Business) => void
	onFondearBusiness?: (business: Business) => void
	onGlobalSearch?: (query: string) => void
	onPageChange?: (page: number) => void
	onPageSizeChange?: (pageSize: number) => void
	onUploadSuccess?: () => void
	onDeleteSuccess?: () => void
	canExportExcel?: boolean
	onExportExcel?: () => void
	isExportingExcel?: boolean
	exportExcelError?: string | null
	onSortingChange?: (sortBy: string | undefined, sortOrder: 'asc' | 'desc') => void
	sortBy?: string
	sortOrder?: 'asc' | 'desc'
	onSaveDateIssued?: (businessId: number, dateIssued: string) => Promise<void>
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
	stats = null,
	isLoading = false,
	isLoadingStats = false,
	isSearching = false,
	hasInitialized = false,
	error = null,
	pagination,
	onAddBusiness = () => { },
	onEditBusiness = () => { },
	onViewBusiness,
	onCancelBusiness,
	onViewObservations,
	onFondearBusiness,
	onGlobalSearch,
	onPageChange,
	onPageSizeChange,
	onUploadSuccess,
	onDeleteSuccess,
	canExportExcel = false,
	onExportExcel,
	isExportingExcel = false,
	exportExcelError = null,
	onSortingChange,
	sortBy,
	sortOrder,
	onSaveDateIssued,
}: MisNegociosPageProps) {
	const { user } = useAuthSession()
	const isAgentUser = true // Stats visible for all roles; data is scoped server-side
	const [statsCollapsed, setStatsCollapsed] = useState(false)

	// Una vez inicializado, nunca mostrar el skeleton completo de nuevo
	const showFullSkeleton = isLoading && !hasInitialized

	// Mostrar loading en la tabla cuando se está buscando o cargando (después de inicializado)
	const showTableLoading = isSearching || (isLoading && hasInitialized)

	return (
		<div className="flex flex-col h-auto w-full min-w-0 overflow-visible gap-4">
			{/* Stats Overview */}
			{isAgentUser && (
				<div className="shrink-0">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resumen</span>
						<Button
							variant="ghost"
							size="sm"
							className="h-6 px-2 gap-1 text-xs text-muted-foreground cursor-pointer"
							onClick={() => setStatsCollapsed((v) => !v)}
						>
							{statsCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
							{statsCollapsed ? 'Mostrar' : 'Ocultar'}
						</Button>
					</div>
					{!statsCollapsed && (
						isLoadingStats ? <StatsLoadingSkeleton /> : <StatsOverview stats={stats} />
					)}
				</div>
			)}

			{/* Error Message */}
			{error && <ErrorMessage message={error} />}

			{/* Business Table Section - fills the 1fr row */}
			<div className="min-h-[520px] h-auto overflow-visible">
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
						onViewObservations={onViewObservations}
						onFondearBusiness={onFondearBusiness}
						pagination={pagination}
						onPageChange={onPageChange}
						onPageSizeChange={onPageSizeChange}
						isSearching={showTableLoading}
						userRole={user?.role ?? undefined}
						onUploadSuccess={onUploadSuccess}
						onDeleteSuccess={onDeleteSuccess}
						canExportExcel={canExportExcel}
						onExportExcel={onExportExcel}
						isExportingExcel={isExportingExcel}
						exportExcelError={exportExcelError}
						onSortingChange={onSortingChange}
						sortBy={sortBy}
						sortOrder={sortOrder}
						onSaveDateIssued={onSaveDateIssued}
					/>
				)}
			</div>
		</div>
	)
}

// Export default para cumplir con PagesPageConfig de Next.js
export default MisNegociosPage
