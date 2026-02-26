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
import { CategoriesTable } from '@/features/admin/categories/components/categories-table'
import { CategoryFilters } from '@/features/admin/categories/components/category-filters'
import { useCategories } from '@/features/admin/categories/hooks/use-categories'
import { useCategoryMutations } from '@/features/admin/categories/hooks/use-category-mutations'
import {
	createCategorySchema,
	updateCategorySchema,
} from '@/features/categories/lib/category-schemas'
import type {
	Category,
	CategoryFilters as CategoryFiltersType,
} from '@/features/categories/types/category.types'

export default function CategoriesAdminPage() {
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [selectedCategory, setSelectedCategory] = useState<Category | null>(
		null
	)
	const [mode, setMode] = useState<'create' | 'edit'>('create')
	const [filters, setFilters] = useState<CategoryFiltersType>({})

	const { categories, isLoading, refreshCategories } = useCategories(filters)
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
					code: formData.code as string,
					name: formData.name as string,
					typeCategory: formData.typeCategory as 'MMS' | 'ALIADO' | 'TRINITY',
					descripcion: formData.descripcion as string | undefined,
					status: formData.status as boolean,
				})
			} else if (selectedCategory) {
				await updateCategory(selectedCategory.idCategory, {
					code: formData.code as string,
					name: formData.name as string,
					typeCategory: formData.typeCategory as 'MMS' | 'ALIADO' | 'TRINITY',
					descripcion: formData.descripcion as string | undefined,
					status: formData.status as boolean,
				})
			}

			setIsModalOpen(false)
			setSelectedCategory(null)
			refreshCategories()
		} catch {
			// Error ya manejado en el hook
		}
	}

	const handleDeleteConfirm = async () => {
		if (!selectedCategory) return

		try {
			await deleteCategory(selectedCategory.idCategory)
			setIsDeleteModalOpen(false)
			setSelectedCategory(null)
			refreshCategories()
		} catch {
			// Error ya manejado en el hook
		}
	}

	const fields: CrudModalField[] = useMemo(
		() => [
			{
				name: 'code',
				label: 'Código',
				type: 'text',
				placeholder: 'Ej: CAT001',
				required: true,
			},
			{
				name: 'name',
				label: 'Nombre',
				type: 'text',
				placeholder: 'Ej: Categoría Principal',
				required: true,
			},
			{
				name: 'typeCategory',
				label: 'Tipo de Categoría',
				type: 'enum',
				enumValues: ['MMS', 'ALIADO', 'TRINITY'],
				required: true,
			},
			{
				name: 'descripcion',
				label: 'Descripción',
				type: 'textarea',
				placeholder: 'Descripción opcional de la categoría',
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

				<CategoryFilters filters={filters} onFiltersChange={setFilters} />

				<CategoriesTable
					categories={categories}
					isLoading={isLoading}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>

				<CrudModal
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
					title={mode === 'create' ? 'Crear Categoría' : 'Editar Categoría'}
					description={
						mode === 'create'
							? 'Completa el formulario para crear una nueva categoría'
							: 'Modifica los datos de la categoría'
					}
					fields={fields}
					schema={
						mode === 'create' ? createCategorySchema : updateCategorySchema
					}
					initialData={
						mode === 'edit' && selectedCategory
							? {
									code: selectedCategory.code,
									name: selectedCategory.name,
									typeCategory: selectedCategory.typeCategory,
									descripcion: selectedCategory.descripcion ?? '',
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
