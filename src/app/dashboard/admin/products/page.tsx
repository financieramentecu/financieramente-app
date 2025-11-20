'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { DashboardLayout } from '@/layouts/DashboardLayout'
import { CrudTable, type CrudTableColumn } from '@/components/admin/CrudTable'
import { CrudModal, type CrudModalField } from '@/components/admin/CrudModal'
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { productSchema } from '@/lib/admin/schemas'

interface Product extends Record<string, unknown> {
	idProduct: number
	name: string
	description: string | null
	status: boolean
	idCompany: number
	idTypeProduct: number | null
	company: {
		idCompany: number
		name: string
	}
	typeProduct: {
		idTypeProduct: number
		name: string
	} | null
	createdAt: string
	updatedAt: string
}

interface CompanyOption {
	idCompany: number
	name: string
	status: boolean
}

export default function ProductsAdminPage() {
	const [products, setProducts] = useState<Product[]>([])
	const [companies, setCompanies] = useState<CompanyOption[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
	const [mode, setMode] = useState<'create' | 'edit'>('create')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [companyFilter, setCompanyFilter] = useState<string>('all')

	const loadCompanies = async () => {
		try {
			const response = await fetch('/api/admin/companies?status=active')
			const data = await response.json()
			if (response.ok) {
				setCompanies(data.companies || [])
			} else {
				toast.error('Error al cargar compañías', {
					description: data.error || 'Ocurrió un error inesperado',
				})
			}
		} catch (error) {
			console.error('Error loading companies:', error)
			toast.error('Error al cargar compañías')
		}
	}

	const loadProducts = async () => {
		try {
			setIsLoading(true)
			const params = new URLSearchParams()
			if (searchQuery) {
				params.set('search', searchQuery)
			}
			if (companyFilter && companyFilter !== 'all') {
				params.set('companyId', companyFilter)
			}
			const queryString = params.toString()
			const response = await fetch(
				`/api/admin/products${queryString ? `?${queryString}` : ''}`
			)
			const data = await response.json()
			if (response.ok) {
				setProducts(data.products || [])
			} else {
				toast.error('Error al cargar productos', {
					description: data.error || 'Ocurrió un error inesperado',
				})
			}
		} catch (error) {
			console.error('Error loading products:', error)
			toast.error('Error al cargar productos')
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		loadCompanies()
	}, [])

	useEffect(() => {
		loadProducts()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchQuery, companyFilter])

	const handleCreate = () => {
		setSelectedProduct(null)
		setMode('create')
		setIsModalOpen(true)
	}

	const handleEdit = (product: Product) => {
		setSelectedProduct(product)
		setMode('edit')
		setIsModalOpen(true)
	}

	const handleDelete = (product: Product) => {
		setSelectedProduct(product)
		setIsDeleteModalOpen(true)
	}

	const handleSubmit = async (formData: Record<string, unknown>) => {
		try {
			setIsSubmitting(true)
			const baseUrl =
				mode === 'create'
					? '/api/admin/products'
					: `/api/admin/products/${selectedProduct?.idProduct}`

			const method = mode === 'create' ? 'POST' : 'PUT'

			const payload = {
				name: formData.name,
				description:
					typeof formData.description === 'string' &&
					formData.description.trim() === ''
						? undefined
						: formData.description,
				idCompany: formData.idCompany,
				idTypeProduct:
					formData.idTypeProduct === '' ? undefined : formData.idTypeProduct,
				status: formData.status,
			}

			const parsedData = productSchema.parse(payload)

			const response = await fetch(baseUrl, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...parsedData,
					description: parsedData.description ?? undefined,
					idTypeProduct: parsedData.idTypeProduct ?? undefined,
				}),
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(
					result.details || result.error || 'Error al guardar producto'
				)
			}

			toast.success(
				mode === 'create'
					? 'Producto creado exitosamente'
					: 'Producto actualizado exitosamente'
			)

			setIsModalOpen(false)
			setSelectedProduct(null)
			loadProducts()
		} catch (error) {
			console.error('Error saving product:', error)
			toast.error('Error al guardar producto', {
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
		if (!selectedProduct) return

		try {
			setIsSubmitting(true)
			const response = await fetch(
				`/api/admin/products/${selectedProduct.idProduct}`,
				{
					method: 'DELETE',
				}
			)

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Error al desactivar producto')
			}

			toast.success('Producto desactivado exitosamente')
			setIsDeleteModalOpen(false)
			setSelectedProduct(null)
			loadProducts()
		} catch (error) {
			console.error('Error deleting product:', error)
			toast.error('Error al desactivar producto', {
				description:
					error instanceof Error
						? error.message
						: 'Ocurrió un error inesperado',
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	const companyOptions = useMemo(
		() =>
			companies.map((company) => ({
				value: company.idCompany.toString(),
				label: company.name,
			})),
		[companies]
	)

	const columns: CrudTableColumn<Product>[] = [
		{
			key: 'idProduct',
			header: 'ID',
			cellRenderer: (value) => (
				<span className="font-medium">#{String(value)}</span>
			),
		},
		{
			key: 'name',
			header: 'Nombre',
			cellRenderer: (value) => (
				<span className="font-medium">{value as string}</span>
			),
		},
		{
			key: 'company',
			header: 'Compañía',
			cellRenderer: (_, row) => (
				<span className="text-sm text-muted-foreground">
					{row.company?.name ?? '—'}
				</span>
			),
		},
		{
			key: 'description',
			header: 'Descripción',
			cellRenderer: (value) =>
				value ? (
					<span className="text-sm text-muted-foreground line-clamp-2">
						{value as string}
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
					{(value as boolean) ? 'Activo' : 'Inactivo'}
				</Badge>
			),
		},
	]

	const fields: CrudModalField[] = useMemo(
		() => [
			{
				name: 'name',
				label: 'Nombre',
				type: 'text',
				placeholder: 'Ej: Skandia Protección Plus',
				required: true,
			},
			{
				name: 'idCompany',
				label: 'Compañía',
				type: 'select',
				required: true,
				options: companyOptions,
			},
			{
				name: 'description',
				label: 'Descripción',
				type: 'textarea',
				placeholder: 'Detalles del producto o cobertura',
			},
			{
				name: 'status',
				label: 'Activo',
				type: 'switch',
				description:
					'Desactiva el producto para que no esté disponible en nuevas gestiones.',
			},
		],
		[companyOptions]
	)

	return (
		<DashboardLayout currentPage="Productos">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Productos</h1>
						<p className="text-muted-foreground mt-2">
							Gestiona los productos disponibles por compañía
						</p>
					</div>
					<Button onClick={handleCreate} className="gap-2">
						<Plus className="h-4 w-4" />
						Crear Producto
					</Button>
				</div>

				<div className="flex flex-col md:flex-row gap-3 md:items-center">
					<Input
						placeholder="Buscar por nombre o descripción..."
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						className="md:w-1/3"
					/>
					<Select value={companyFilter} onValueChange={setCompanyFilter}>
						<SelectTrigger className="md:w-64">
							<SelectValue placeholder="Filtrar por compañía" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todas las compañías</SelectItem>
							{companyOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<CrudTable
					data={products}
					columns={columns}
					onEdit={handleEdit}
					onDelete={handleDelete}
					isLoading={isLoading}
					searchable={false}
					emptyMessage="No hay productos registrados"
				/>

				<CrudModal
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
					title={mode === 'create' ? 'Crear Producto' : 'Editar Producto'}
					description={
						mode === 'create'
							? 'Completa el formulario para registrar un nuevo producto'
							: 'Modifica los datos del producto seleccionado'
					}
					fields={fields}
					schema={productSchema}
					initialData={
						mode === 'edit' && selectedProduct
							? {
									name: selectedProduct.name,
									idCompany: selectedProduct.idCompany.toString(),
									description: selectedProduct.description ?? '',
									status: selectedProduct.status,
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
					itemName={selectedProduct?.name || ''}
					onConfirm={handleDeleteConfirm}
					isLoading={isSubmitting}
				/>
			</div>
		</DashboardLayout>
	)
}
