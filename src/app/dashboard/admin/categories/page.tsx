'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { CrudTable, type CrudTableColumn } from '@/components/admin/CrudTable'
import { CrudModal, type CrudModalField } from '@/components/admin/CrudModal'
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { categorySchema, type CategoryFormData } from '@/lib/admin/schemas'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface Category extends Record<string, unknown> {
	idCategory: number
	code: string
	name: string
	typeCategory: 'MMS' | 'ALIADO' | 'TRINITY'
	descripcion: string | null
	status: boolean
	createdAt: string
	updatedAt: string
}

const CATEGORY_LABELS: Record<Category['typeCategory'], string> = {
	MMS: 'MMS',
	ALIADO: 'Aliado',
	TRINITY: 'Trinity',
}

export default function CategoriesAdminPage() {
	const [categories, setCategories] = useState<Category[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [selectedCategory, setSelectedCategory] = useState<Category | null>(
		null
	)
	const [mode, setMode] = useState<'create' | 'edit'>('create')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [typeFilter, setTypeFilter] = useState<string>('all')

	const loadCategories = async () => {
		try {
			setIsLoading(true)
			const params = new URLSearchParams()
			if (searchQuery) {
				params.set('search', searchQuery)
			}
			if (typeFilter && typeFilter !== 'all') {
				params.set('type', typeFilter)
			}
			const response = await fetch(`/api/admin/categories?${params.toString()}`)
			const data = await response.json()
			if (response.ok) {
				setCategories(data.categories || [])
			} else {
				toast.error('Error al cargar categorías', {
					description: data.error || 'Ocurrió un error inesperado',
				})
			}
		} catch (error) {
			console.error('Error loading categories:', error)
			toast.error('Error al cargar categorías')
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		loadCategories()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchQuery, typeFilter])

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

	const handleSubmit = async (data: Record<string, unknown>) => {
		const formData = data as CategoryFormData
		try {
			setIsSubmitting(true)
			const url =
				mode === 'create'
					? '/api/admin/categories'
					: `/api/admin/categories/${selectedCategory?.idCategory}`

			const method = mode === 'create' ? 'POST' : 'PUT'

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...formData,
					descripcion:
						formData.descripcion === '' ? undefined : formData.descripcion,
				}),
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(
					result.details || result.error || 'Error al guardar categoría'
				)
			}

			toast.success(
				mode === 'create'
					? 'Categoría creada exitosamente'
					: 'Categoría actualizada exitosamente'
			)

			setIsModalOpen(false)
			setSelectedCategory(null)
			loadCategories()
		} catch (error) {
			console.error('Error saving category:', error)
			toast.error('Error al guardar categoría', {
				description:
					error instanceof Error
						? error.message
						: 'Ocurrió un error inesperado',
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleDeleteConfirm = async () => {
		if (!selectedCategory) return

		try {
			setIsSubmitting(true)
			const response = await fetch(
				`/api/admin/categories/${selectedCategory.idCategory}`,
				{
					method: 'DELETE',
				}
			)

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Error al eliminar categoría')
			}

			toast.success('Categoría eliminada exitosamente')
			setIsDeleteModalOpen(false)
			setSelectedCategory(null)
			loadCategories()
		} catch (error) {
			console.error('Error deleting category:', error)
			toast.error('Error al eliminar categoría', {
				description:
					error instanceof Error
						? error.message
						: 'Ocurrió un error inesperado',
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	const filteredCategories = useMemo(() => {
		if (!searchQuery && !typeFilter) {
			return categories
		}

		return categories.filter((category) => {
			const matchesSearch =
				!searchQuery ||
				category.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
				category.name.toLowerCase().includes(searchQuery.toLowerCase())
			const matchesType =
				typeFilter === 'all' || category.typeCategory === typeFilter

			return matchesSearch && matchesType
		})
	}, [categories, searchQuery, typeFilter])

	const columns: CrudTableColumn<Category>[] = [
		{
			key: 'idCategory',
			header: 'ID',
			cellRenderer: (value) => (
				<span className="font-medium">#{String(value)}</span>
			),
		},
		{
			key: 'code',
			header: 'Código',
			cellRenderer: (value) => (
				<span className="font-mono text-sm">{String(value)}</span>
			),
		},
		{
			key: 'name',
			header: 'Nombre',
			cellRenderer: (value) => (
				<span className="font-medium">{String(value)}</span>
			),
		},
		{
			key: 'typeCategory',
			header: 'Tipo',
			cellRenderer: (value) => (
				<span className="text-sm">
					{CATEGORY_LABELS[value as Category['typeCategory']]}
				</span>
			),
		},
		{
			key: 'descripcion',
			header: 'Descripción',
			cellRenderer: (value) =>
				value ? (
					<span className="text-sm text-muted-foreground line-clamp-2">
						{String(value)}
					</span>
				) : (
					<span className="text-muted-foreground">-</span>
				),
		},
		{
			key: 'status',
			header: 'Estado',
			cellRenderer: (value) => (
				<Badge variant={(value as boolean) ? 'success' : 'neutral'}>
					{value ? 'Activa' : 'Inactiva'}
				</Badge>
			),
		},
	]

	const fields: CrudModalField[] = [
		{
			name: 'code',
			label: 'Código',
			type: 'text',
			placeholder: 'Ej: MMS-01',
			required: true,
		},
		{
			name: 'name',
			label: 'Nombre',
			type: 'text',
			placeholder: 'Ej: Ejecutivo Senior',
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
			placeholder: 'Descripción breve de la categoría',
			required: false,
		},
		{
			name: 'status',
			label: 'Activa',
			type: 'switch',
			required: false,
			description:
				'Desactiva una categoría para ocultarla sin perder su historial.',
		},
	]

	return (
		<DashboardLayout currentPage="Categorías">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Categorías de Usuarios</h1>
						<p className="text-muted-foreground mt-2">
							Administra las categorías utilizadas en la estructura comercial
						</p>
					</div>
					<Button onClick={handleCreate} className="gap-2">
						<Plus className="h-4 w-4" />
						Crear Categoría
					</Button>
				</div>

				<div className="flex flex-col md:flex-row gap-3 md:items-center">
					<Input
						placeholder="Buscar por código o nombre..."
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						className="md:w-1/3"
					/>
					<Select value={typeFilter} onValueChange={setTypeFilter}>
						<SelectTrigger className="md:w-64">
							<SelectValue placeholder="Filtrar por tipo" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todos los tipos</SelectItem>
							<SelectItem value="MMS">MMS</SelectItem>
							<SelectItem value="ALIADO">Aliado</SelectItem>
							<SelectItem value="TRINITY">Trinity</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<CrudTable
					data={filteredCategories}
					columns={columns}
					onEdit={handleEdit}
					onDelete={handleDelete}
					isLoading={isLoading}
					searchable={false}
					emptyMessage="No hay categorías registradas"
				/>

				<CrudModal
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
					title={mode === 'create' ? 'Crear Categoría' : 'Editar Categoría'}
					description={
						mode === 'create'
							? 'Define una nueva categoría dentro de la jerarquía comercial'
							: 'Modifica los datos de la categoría seleccionada'
					}
					fields={fields}
					schema={categorySchema}
					initialData={
						mode === 'edit' && selectedCategory
							? ({
									code: selectedCategory.code,
									name: selectedCategory.name,
									typeCategory: selectedCategory.typeCategory,
									descripcion: selectedCategory.descripcion || '',
									status: selectedCategory.status,
								} as CategoryFormData)
							: ({
									status: true,
									typeCategory: 'MMS',
								} as CategoryFormData)
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
