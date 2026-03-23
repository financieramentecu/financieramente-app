import { Skeleton } from '@/features/shared/ui/skeleton'

export default function Loading() {
	return (
		<div className="max-w-2xl mx-auto space-y-6">
			<div>
				<Skeleton className="h-9 w-80" />
				<Skeleton className="h-5 w-64 mt-2" />
			</div>
			<div className="border rounded-lg p-6 space-y-4">
				<Skeleton className="h-6 w-48" />
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-10 w-full rounded-md" />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
