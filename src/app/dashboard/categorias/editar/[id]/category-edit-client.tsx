'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CategoryForm } from '@/features/categories/components/category-form'
import { EditCategoryFormSkeleton } from '@/features/categories/components/category-form-skeleton'
import { useCategory } from '@/features/categories/hooks/use-category'
import { useCategoryMutations } from '@/features/categories/hooks/use-category-mutations'
import type { UpdateCategoryFormData } from '@/features/categories/lib/category-schemas'
import { toast } from 'sonner'

interface CategoryEditClientProps {
	id: number
}

/**
 * Client Component for Edit Category Page
 */
export function CategoryEditClient({ id }: CategoryEditClientProps) {
	const router = useRouter()
	const { state: categoryState } = useCategory(id)
	const { updateCategory, updateState } = useCategoryMutations()

	const handleSubmit = useCallback(
		async (data: UpdateCategoryFormData) => {
			await updateCategory(id, data)
		},
		[updateCategory, id]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/categorias')
	}, [router])

	// Handle update response
	useEffect(() => {
		if (updateState.status === 'success') {
			toast.success('Categoría actualizada exitosamente')
			router.push('/dashboard/categorias')
		} else if (updateState.status === 'error') {
			toast.error(updateState.error || 'Error al actualizar categoría')
		}
	}, [updateState.status, updateState.error, router])

	// Render based on state
	if (categoryState.status === 'loading') {
		return <EditCategoryFormSkeleton />
	}

	if (categoryState.status === 'error') {
		return (
			<div className="flex flex-col items-center justify-center h-64 space-y-4">
				<div className="text-destructive">{categoryState.error}</div>
				<button
					onClick={() => router.push('/dashboard/categorias')}
					className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
				>
					Volver a la lista
				</button>
			</div>
		)
	}

	if (categoryState.status === 'success') {
		return (
			<div className="max-w-2xl w-full mx-auto">
				<div className="space-y-6">
					<div>
						<h1 className="text-3xl font-bold">Editar Categoría</h1>
						<p className="text-muted-foreground mt-2">
							Modifique los datos de la categoría
						</p>
					</div>

					<CategoryForm
						mode="edit"
						initialData={categoryState.data}
						onSubmit={handleSubmit}
						onCancel={handleCancel}
						isLoading={updateState.status === 'loading'}
					/>
				</div>
			</div>
		)
	}

	return null
}
