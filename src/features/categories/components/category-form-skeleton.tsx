import { Skeleton } from '@/features/shared/ui/skeleton'

/**
 * Skeleton for category form loading (create/edit)
 * Reflects the exact structure of CategoryForm
 */
export function CategoryFormSkeleton() {
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

					{/* TypeCategory field */}
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
 * Skeleton specific for category edit page
 * Identical structure to the real component
 */
export function EditCategoryFormSkeleton() {
	return (
		<div className="max-w-2xl mx-auto">
			<div className="space-y-6 w-full">
				{/* Header skeleton - Title and description */}
				<div>
					<Skeleton className="h-9 w-48" />
					<Skeleton className="h-5 w-96 mt-2" />
				</div>

				{/* Form skeleton - identical structure to <form className="space-y-6"> */}
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

					{/* TypeCategory field */}
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
