import { Skeleton } from '@/features/shared/ui/skeleton'

/**
 * Skeleton for level form loading (create/edit)
 */
export function LevelFormSkeleton() {
	return (
		<div className="max-w-2xl mx-auto">
			<div className="space-y-6">
				{/* Header skeleton */}
				<div className="space-y-2">
					<Skeleton className="h-9 w-48" />
					<Skeleton className="h-5 w-96" />
				</div>

				{/* Form skeleton */}
				<div className="space-y-6">
					{/* Code field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* Name field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* TypeLevel field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* Description field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-24 w-full" />
					</div>

					{/* Status field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* FormActions skeleton */}
					<div className="flex justify-end gap-3 pt-4">
						<Skeleton className="h-10 w-24" />
						<Skeleton className="h-10 w-32" />
					</div>
				</div>
			</div>
		</div>
	)
}

/**
 * Skeleton specific for level edit page
 */
export function EditLevelFormSkeleton() {
	return (
		<div className="max-w-2xl mx-auto">
			<div className="space-y-6 w-full">
				{/* Header skeleton */}
				<div>
					<Skeleton className="h-9 w-48" />
					<Skeleton className="h-5 w-96 mt-2" />
				</div>

				{/* Form skeleton */}
				<div className="space-y-6">
					{/* Code field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* Name field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* TypeLevel field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* Description field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-24 w-full" />
					</div>

					{/* Status field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* FormActions skeleton */}
					<div className="flex justify-end gap-3 pt-4">
						<Skeleton className="h-10 w-24" />
						<Skeleton className="h-10 w-32" />
					</div>
				</div>
			</div>
		</div>
	)
}
