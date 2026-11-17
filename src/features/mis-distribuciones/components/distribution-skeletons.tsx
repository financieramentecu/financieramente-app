import { SkeletonRegion } from '@/features/shared/ui/loading-skeletons'
import { Skeleton } from '@/features/shared/ui/skeleton'

/** Mirrors the "Mis distribuciones" list: a grid of period cards. */
export function DistributionCardsSkeleton({ cards = 6 }: { cards?: number }) {
	return (
		<SkeletonRegion
			label="Cargando distribuciones"
			className="grid grid-cols-1 gap-3 md:grid-cols-2"
		>
			{Array.from({ length: cards }).map((_, i) => (
				<div
					key={i}
					data-testid="distribution-card-skeleton"
					className="rounded-lg border border-border bg-card p-4 shadow-sm"
				>
					<div className="flex items-start justify-between gap-3">
						<div className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-48" />
						</div>
						<Skeleton className="h-5 w-20 rounded-full" />
					</div>
					<div className="mt-4 grid grid-cols-3 gap-2">
						{[0, 1, 2].map((c) => (
							<div key={c} className="space-y-1.5">
								<Skeleton className="h-3 w-12" />
								<Skeleton className="h-4 w-16" />
							</div>
						))}
					</div>
				</div>
			))}
		</SkeletonRegion>
	)
}

/** Mirrors the receipt: summary card followed by the per-business accordion. */
export function DistributionReceiptSkeleton({ rows = 4 }: { rows?: number }) {
	return (
		<SkeletonRegion label="Cargando recibo" className="space-y-4">
			<div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-4">
				{[0, 1, 2, 3].map((i) => (
					<div key={i} className="space-y-2">
						<Skeleton className="h-3 w-16" />
						<Skeleton className="h-6 w-24" />
					</div>
				))}
			</div>
			<Skeleton className="h-4 w-40" />
			<div className="divide-y divide-border rounded-lg border border-border bg-card">
				{Array.from({ length: rows }).map((_, i) => (
					<div
						key={i}
						data-testid="receipt-row-skeleton"
						className="flex items-center justify-between gap-4 px-4 py-3"
					>
						<div className="space-y-2">
							<Skeleton className="h-4 w-44" />
							<Skeleton className="h-3 w-28" />
						</div>
						<Skeleton className="h-5 w-24" />
					</div>
				))}
			</div>
		</SkeletonRegion>
	)
}
