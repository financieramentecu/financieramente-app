'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { Button } from '@/features/shared/ui/button'
import {
	CrudModal,
	type CrudModalField,
} from '@/features/admin/shared/CrudModal'
import { DeleteConfirmModal } from '@/features/admin/shared/DeleteConfirmModal'
import { ProductsTable } from '@/features/admin/products/components/products-table'
import { ProductFilters } from '@/features/admin/products/components/product-filters'
import { useProducts, useActiveCompanies } from '@/features/admin/products/hooks/use-products'
import { useProductMutations } from '@/features/admin/products/hooks/use-product-mutations'
import {
	createProductSchema,
	updateProductSchema,
} from '@/features/product/lib/product-schemas'
import type {
	Product,
	ProductFilters as ProductFiltersType,
} from '@/features/product/types/product.types'

export default function ProductsAdminPage() {
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
	const [mode, setMode] = useState<'create' | 'edit'>('create')
	const [filters, setFilters] = useState<ProductFiltersType>({})

	const { state: productsState, refetch: refreshProducts } = useProducts(filters)
	const { state: companiesState } = useActiveCompanies()
	const { create, update, remove, isSubmitting } = useProductMutations()

	const products = productsState.data || []
	const isLoading = productsState.status === 'loading'
	const companies = useMemo(() => companiesState.data || [], [companiesState.data])

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
		let result;
		if (mode === 'create') {
			result = await create({
				name: formData.name as string,
				description: formData.description as string | undefined,
				idCompany: Number(formData.idCompany),
				idTypeProduct: formData.idTypeProduct
					? Number(formData.idTypeProduct)
					: undefined,
				status: formData.status as boolean,
			})
		} else if (selectedProduct) {
			result = await update(selectedProduct.idProduct, {
				name: formData.name as string,
				description: formData.description as string | undefined,
				idCompany: Number(formData.idCompany),
				idTypeProduct: formData.idTypeProduct
					? Number(formData.idTypeProduct)
					: undefined,
				status: formData.status as boolean,
			})
		}

		if (result?.success) {
			setIsModalOpen(false)
			setSelectedProduct(null)
			refreshProducts()
		}
	}

	const handleDeleteConfirm = async () => {
		if (!selectedProduct) return

		const result = await remove(selectedProduct.idProduct)
		if (result.success) {
			setIsDeleteModalOpen(false)
			setSelectedProduct(null)
			refreshProducts()
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

				<ProductFilters
					filters={filters}
					companies={companies}
					onFiltersChange={setFilters}
				/>

				<ProductsTable
					products={products}
					isLoading={isLoading}
					onEdit={handleEdit}
					onDelete={handleDelete}
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
					schema={mode === 'create' ? createProductSchema : updateProductSchema}
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
