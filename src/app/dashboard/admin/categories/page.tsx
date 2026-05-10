'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import {
	CrudModal,
	type CrudModalField,
} from '@/features/admin/shared/CrudModal'
import { DeleteConfirmModal } from '@/features/admin/shared/DeleteConfirmModal'
import { Button } from '@/features/shared/ui/button'
import { AdminCategoriesTable as CategoriesTable } from '@/features/categories/components/admin-categories-table'
import { useAdminCategories as useCategories } from '@/features/categories/hooks/use-admin-categories'
import { useAdminCategoryMutations as useCategoryMutations } from '@/features/categories/hooks/use-admin-category-mutations'
import {
	createCategorySchema,
	updateCategorySchema,
} from '@/features/categories/lib/category-schemas'
import type { Category } from '@/features/categories/types/category.types'

export default function CategoriesAdminPage() {
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
	const [mode, setMode] = useState<'create' | 'edit'>('create')

	const { categories, isLoading, refreshCategories } = useCategories()
	const { createCategory, updateCategory, deleteCategory, isSubmitting } =
		useCategoryMutations()

	const handleCreate = () => {
		setSelectedCategory(null)
		setMode('create')
		setIsModalOpen(true)
	}

	const handleEdit = (category: Category) => {
		setSelectedCategory(category)
		setMode('edit')
		setIsModalOpen(true)
	}

	const handleDelete = (category: Category) => {
		setSelectedCategory(category)
		setIsDeleteModalOpen(true)
	}

	const handleSubmit = async (formData: Record<string, unknown>) => {
		try {
			if (mode === 'create') {
				await createCategory({
					name: formData.name as string,
					idCategoryType: formData.idCategoryType as number,
					description: formData.description as string | undefined,
					status: formData.status as boolean,
				})
			} else if (selectedCategory) {
				await updateCategory(selectedCategory.id, {
					name: formData.name as string | undefined,
					idCategoryType: formData.idCategoryType as number | undefined,
					description: formData.description as string | undefined,
					status: formData.status as boolean | undefined,
				})
			}

			setIsModalOpen(false)
			setSelectedCategory(null)
			refreshCategories()
		} catch {
			// Error already handled in hook
		}
	}

	const handleDeleteConfirm = async () => {
		if (!selectedCategory) return

		try {
			await deleteCategory(selectedCategory.id)
			setIsDeleteModalOpen(false)
			setSelectedCategory(null)
			refreshCategories()
		} catch {
			// Error already handled in hook
		}
	}

	const fields: CrudModalField[] = useMemo(
		() => [
			{
				name: 'name',
				label: 'Nombre',
				type: 'text',
				placeholder: 'Ej: Categoría Principal',
				required: true,
			},
			{
				name: 'description',
				label: 'Descripción',
				type: 'textarea',
				placeholder: 'Descripción opcional',
			},
			{
				name: 'status',
				label: 'Activo',
				type: 'switch',
				description: 'Controla si la categoría está disponible para uso.',
			},
		],
		[]
	)

	return (
		<DashboardLayout currentPage="Categorías">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Categorías</h1>
						<p className="text-muted-foreground mt-2">
							Gestiona las categorías del sistema
						</p>
					</div>
					<Button onClick={handleCreate} className="gap-2">
						<Plus className="h-4 w-4" />
						Crear Categoría
					</Button>
				</div>

				<CategoriesTable
					categories={categories}
					isLoading={isLoading}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>

				<CrudModal
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
					contentClassName="max-w-lg"
					title={mode === 'create' ? 'Crear Categoría' : 'Editar Categoría'}
					description={
						mode === 'create'
							? 'Completa el formulario para crear una nueva categoría'
							: 'Modifica los datos de la categoría'
					}
					fields={fields}
					schema={mode === 'create' ? createCategorySchema : updateCategorySchema}
					initialData={
						mode === 'edit' && selectedCategory
							? {
								name: selectedCategory.name,
								description: selectedCategory.description ?? '',
								status: selectedCategory.status,
							}
							: {
								status: true,
							}
					}
					onSubmit={handleSubmit}
					mode={mode}
					isLoading={isSubmitting}
				/>

				<DeleteConfirmModal
					open={isDeleteModalOpen}
					onOpenChange={setIsDeleteModalOpen}
					itemName={selectedCategory?.name || ''}
					onConfirm={handleDeleteConfirm}
					isLoading={isSubmitting}
				/>
			</div>
		</DashboardLayout>
	)
}
