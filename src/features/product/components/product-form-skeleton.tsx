import { Skeleton } from '@/features/shared/ui/skeleton'

/**
 * Skeleton para carga del formulario de producto (crear/editar)
 * Refleja la estructura exacta del ProductForm
 */
export function ProductFormSkeleton() {
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
					{/* Compañía field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-10 w-full" />
					</div>

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
 * Skeleton específico para edición de producto
 * Estructura idéntica al componente real: max-w-2xl mx-auto > space-y-6 > (header + form)
 */
export function EditProductFormSkeleton() {
	return (
		<div className="max-w-2xl mx-auto">
			<div className="space-y-6 w-full">
				{/* Header skeleton - Título y descripción */}
				<div>
					<Skeleton className="h-9 w-48" />
					<Skeleton className="h-5 w-130 mt-2" />
				</div>

				{/* Form skeleton - estructura idéntica a <form className="space-y-6"> */}
				<div className="space-y-6">
					{/* Compañía field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-10 w-full" />
					</div>

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
