import { Skeleton } from '@/features/shared/ui/skeleton'

const KPI_CARD_COUNT = 3
const TABLE_ROW_COUNT = 8
const TABLE_COLUMN_COUNT = 6

/**
 * Loading placeholder for the negocios page: mirrors the KPI cards and the
 * list table so the layout does not jump when the real content arrives.
 */
export function NegociosPageSkeleton() {
	return (
		<div
			className="flex flex-col gap-4"
			role="status"
			aria-busy="true"
			aria-label="Cargando negocios"
			data-testid="negocios-page-skeleton"
		>
			<div className="flex items-center justify-between gap-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-9 w-36" />
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				{Array.from({ length: KPI_CARD_COUNT }, (_, index) => (
					<div key={index} className="space-y-3 rounded-lg border bg-card p-4">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-7 w-40" />
						<Skeleton className="h-3 w-24" />
					</div>
				))}
			</div>

			<div className="flex items-center gap-2">
				<Skeleton className="h-9 w-full max-w-sm" />
				<Skeleton className="h-9 w-28" />
			</div>

			<div className="space-y-2 rounded-lg border bg-card p-4">
				<div
					className="grid gap-4"
					style={{ gridTemplateColumns: `repeat(${TABLE_COLUMN_COUNT}, minmax(0, 1fr))` }}
				>
					{Array.from({ length: TABLE_COLUMN_COUNT }, (_, index) => (
						<Skeleton key={index} className="h-4 w-20" />
					))}
				</div>
				{Array.from({ length: TABLE_ROW_COUNT }, (_, row) => (
					<div
						key={row}
						className="grid gap-4"
						style={{ gridTemplateColumns: `repeat(${TABLE_COLUMN_COUNT}, minmax(0, 1fr))` }}
					>
						{Array.from({ length: TABLE_COLUMN_COUNT }, (_, column) => (
							<Skeleton key={column} className="h-6 w-full" />
						))}
					</div>
				))}
			</div>
		</div>
	)
}
