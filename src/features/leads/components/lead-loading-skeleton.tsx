import { Skeleton } from '@/features/shared/ui/skeleton'

/** Placeholder rows while a task or case list is still loading. */
export function LeadListSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
	return (
		<div role="status" aria-busy="true" className="space-y-3">
			<span className="sr-only">{label}</span>
			{Array.from({ length: rows }, (_, index) => (
				<div key={index} className="space-y-2">
					<Skeleton className="h-4 w-3/5" />
					<Skeleton className="h-3 w-2/5" />
				</div>
			))}
		</div>
	)
}

/** Placeholder rail while the lead history or a comment thread is still loading. */
export function LeadTimelineSkeleton({ label }: { label: string }) {
	return (
		<div role="status" aria-busy="true" className="space-y-3">
			<span className="sr-only">{label}</span>
			<Skeleton className="h-3 w-24" />
			<ol>
				{[0, 1, 2].map((index) => (
					<li
						key={index}
						className="relative border-l border-slate-200 pb-4 pl-4 last:pb-1 dark:border-slate-700"
					>
						<span
							className="absolute -left-1.5 top-1 size-3 animate-pulse rounded-full bg-gray-300 dark:bg-gray-600"
							aria-hidden
						/>
						<Skeleton className="h-3 w-36" />
						<Skeleton className="mt-2 h-4 w-48" />
						<Skeleton className="mt-2 h-3 w-full" />
					</li>
				))}
			</ol>
		</div>
	)
}
