'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CategoryForm } from '@/features/categories/components/category-form'
import { useCategoryMutations } from '@/features/categories/hooks/use-category-mutations'
import type {
	CreateCategoryFormData,
	UpdateCategoryFormData,
} from '@/features/categories/lib/category-schemas'
import { toast } from 'sonner'

/**
 * Client Component for Create Category Page
 */
export function CategoryCreateClient() {
	const router = useRouter()
	const { createCategory, createState } = useCategoryMutations()

	const handleSubmit = useCallback(
		async (data: CreateCategoryFormData | UpdateCategoryFormData) => {
			// In create mode, we always receive CreateCategoryFormData
			await createCategory(data as CreateCategoryFormData)
		},
		[createCategory]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/categorias')
	}, [router])

	// Handle create response
	useEffect(() => {
		if (createState.status === 'success') {
			toast.success('Categoría creada exitosamente')
			router.push('/dashboard/categorias')
		} else if (createState.status === 'error') {
			toast.error(createState.error || 'Error al crear categoría')
		}
	}, [createState.status, createState.error, router])

	return (
		<div className="max-w-2xl mx-auto">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">Nueva Categoría</h1>
					<p className="text-muted-foreground mt-2">
						Complete el formulario para crear una nueva categoría de agente
					</p>
				</div>

				<CategoryForm
					mode="create"
					onSubmit={handleSubmit}
					onCancel={handleCancel}
					isLoading={createState.status === 'loading'}
				/>
			</div>
		</div>
	)
}
