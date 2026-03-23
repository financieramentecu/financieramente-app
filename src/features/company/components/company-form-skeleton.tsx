import { Skeleton } from '@/features/shared/ui/skeleton'

/**
 * Skeleton for company form loading state (create/edit)
 * Mirrors the exact structure of CompanyForm
 */
export function CompanyFormSkeleton() {
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
					{/* Nombre field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* Estado field */}
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
 * Skeleton for edit company form loading state
 */
export function EditCompanyFormSkeleton() {
	return (
		<div className="max-w-2xl mx-auto">
			<div className="space-y-6 w-full">
				{/* Header skeleton */}
				<div>
					<Skeleton className="h-9 w-48" />
					<Skeleton className="h-5 w-130 mt-2" />
				</div>

				{/* Form skeleton */}
				<div className="space-y-6">
					{/* Nombre field (disabled in edit mode) */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-10 w-full bg-muted" />
					</div>

					{/* Estado field */}
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
