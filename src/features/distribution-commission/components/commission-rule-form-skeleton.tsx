import { Skeleton } from '@/features/shared/ui/skeleton'

export function CommissionRuleFormSkeleton() {
	return (
		<div className="space-y-8">
			<div className="grid gap-6 md:grid-cols-2">
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-12 w-full" />
				</div>
			</div>

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-2">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-4 w-56" />
					</div>
					<Skeleton className="h-9 w-40 rounded-md" />
				</div>

				<div className="rounded-md border p-4 space-y-4">
					{Array.from({ length: 2 }).map((_, index) => (
						<div key={index} className="flex items-end gap-4">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-[150px]" />
							<Skeleton className="h-10 w-10" />
						</div>
					))}
				</div>
			</div>

			<div className="flex justify-end space-x-4">
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-40" />
			</div>
		</div>
	)
}
