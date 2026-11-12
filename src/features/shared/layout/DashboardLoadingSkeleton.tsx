import { Skeleton } from '@/features/shared/ui/skeleton'

/**
 * Generic placeholder for any /dashboard page while the server session check
 * runs. It paints before the page-specific loading state is available.
 */
export function DashboardLoadingSkeleton() {
	return (
		<div
			className="flex min-h-screen"
			role="status"
			aria-busy="true"
			aria-label="Cargando"
			data-testid="dashboard-loading-skeleton"
		>
			<div className="hidden w-60 shrink-0 space-y-3 border-r bg-card p-4 md:block">
				<Skeleton className="h-8 w-32" />
				{Array.from({ length: 6 }, (_, index) => (
					<Skeleton key={index} className="h-6 w-full" />
				))}
			</div>
			<div className="flex-1 space-y-4 p-6">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-8 w-48" />
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{Array.from({ length: 3 }, (_, index) => (
						<Skeleton key={index} className="h-24 w-full" />
					))}
				</div>
				<Skeleton className="h-64 w-full" />
			</div>
		</div>
	)
}
