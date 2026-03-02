'use client'

import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import {
	CrudTable,
	type CrudTableColumn,
} from '@/features/admin/shared/CrudTable'
import {
	CrudModal,
	type CrudModalField,
} from '@/features/admin/shared/CrudModal'
import { DeleteConfirmModal } from '@/features/admin/shared/DeleteConfirmModal'
import { Button } from '@/features/shared/ui/button'
import { Plus } from 'lucide-react'
import { Badge } from '@/features/shared/ui/badge'
import { toast } from 'sonner'
import {
	createClientOriginSchema,
	updateClientOriginSchema,
	createProductOriginSchema,
	updateProductOriginSchema,
} from '@/features/origins/lib/origins-schemas'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/features/shared/ui/tabs'

interface ProductOrigin extends Record<string, unknown> {
	idOrigin: number
	name: string
	description: string | null
	status: boolean
	createdAt: string
	updatedAt: string
}

interface ClientOrigin extends Record<string, unknown> {
	idClientOrigin: number
	name: string
	description: string | null
	status: boolean
	createdAt: string
	updatedAt: string
}

function ProductOriginsSection() {
	const [origins, setOrigins] = useState<ProductOrigin[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [selectedOrigin, setSelectedOrigin] = useState<ProductOrigin | null>(
		null
	)
	const [mode, setMode] = useState<'create' | 'edit'>('create')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const loadOrigins = async () => {
		try {
			setIsLoading(true)
			const response = await fetch('/api/admin/product-origins')
			const data = await response.json()
			if (response.ok) {
				setOrigins(data.origins || [])
			} else {
				toast.error('Error al cargar orígenes de producto', {
					description: data.error || 'Ocurrió un error inesperado',
				})
			}
		} catch (error) {
			console.error('Error loading product origins:', error)
			toast.error('Error al cargar orígenes de producto')
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		loadOrigins()
	}, [])

	const handleCreate = () => {
		setSelectedOrigin(null)
		setMode('create')
		setIsModalOpen(true)
	}

	const handleEdit = (origin: ProductOrigin) => {
		setSelectedOrigin(origin)
		setMode('edit')
		setIsModalOpen(true)
	}

	const handleDelete = (origin: ProductOrigin) => {
		setSelectedOrigin(origin)
		setIsDeleteModalOpen(true)
	}

	const handleSubmit = async (data: Record<string, unknown>) => {
		const formData = data
		try {
			setIsSubmitting(true)
			const url =
				mode === 'create'
					? '/api/admin/product-origins'
					: `/api/admin/product-origins/${selectedOrigin?.idOrigin}`

			const method = mode === 'create' ? 'POST' : 'PUT'

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...formData,
					description:
						formData.description === '' ? undefined : formData.description,
				}),
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(
					result.details ||
						result.error ||
						'Error al guardar origen de producto'
				)
			}

			toast.success(
				mode === 'create'
					? 'Origen de producto creado exitosamente'
					: 'Origen de producto actualizado exitosamente'
			)

			setIsModalOpen(false)
			setSelectedOrigin(null)
			loadOrigins()
		} catch (error) {
			console.error('Error saving product origin:', error)
			toast.error('Error al guardar origen de producto', {
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
		if (!selectedOrigin) return

		try {
			setIsSubmitting(true)
			const response = await fetch(
				`/api/admin/product-origins/${selectedOrigin.idOrigin}`,
				{
					method: 'DELETE',
				}
			)

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Error al eliminar origen de producto')
			}

			toast.success('Origen de producto eliminado exitosamente')
			setIsDeleteModalOpen(false)
			setSelectedOrigin(null)
			loadOrigins()
		} catch (error) {
			console.error('Error deleting product origin:', error)
			toast.error('Error al eliminar origen de producto', {
				description:
					error instanceof Error
						? error.message
						: 'Ocurrió un error inesperado',
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	const columns: CrudTableColumn<ProductOrigin>[] = [
		{
			key: 'idOrigin',
			header: 'ID',
			cellRenderer: (value) => (
				<span className="font-medium">#{String(value)}</span>
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
			key: 'description',
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
					{(value as boolean) ? 'Activo' : 'Inactivo'}
				</Badge>
			),
		},
	]

	const fields: CrudModalField[] = [
		{
			name: 'name',
			label: 'Nombre',
			type: 'text',
			placeholder: 'Ej: Propio',
			required: true,
		},
		{
			name: 'description',
			label: 'Descripción',
			type: 'textarea',
			placeholder: 'Información adicional sobre el origen',
			required: false,
		},
		{
			name: 'status',
			label: 'Activo',
			type: 'switch',
			required: false,
			description:
				'Deshabilita este origen para impedir su uso en nuevos productos.',
		},
	]

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-semibold">Orígenes de Producto</h2>
					<p className="text-muted-foreground mt-1">
						Define los orígenes válidos para los productos comercializados
					</p>
				</div>
				<Button onClick={handleCreate} className="gap-2">
					<Plus className="h-4 w-4" />
					Crear Origen
				</Button>
			</div>

			<CrudTable
				data={origins}
				columns={columns}
				onEdit={handleEdit}
				onDelete={handleDelete}
				isLoading={isLoading}
				searchable
				emptyMessage="No hay orígenes de producto registrados"
			/>

			<CrudModal
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
				title={
					mode === 'create'
						? 'Crear Origen de Producto'
						: 'Editar Origen de Producto'
				}
				description={
					mode === 'create'
						? 'Completa el formulario para registrar un nuevo origen de producto'
						: 'Modifica los datos del origen de producto seleccionado'
				}
				fields={fields}
				schema={
					mode === 'create'
						? createProductOriginSchema
						: updateProductOriginSchema
				}
				initialData={
					mode === 'edit' && selectedOrigin
						? {
								name: selectedOrigin.name,
								description: selectedOrigin.description || '',
								status: selectedOrigin.status,
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
				itemName={selectedOrigin?.name || ''}
				onConfirm={handleDeleteConfirm}
				isLoading={isSubmitting}
			/>
		</div>
	)
}

function ClientOriginsSection() {
	const [origins, setOrigins] = useState<ClientOrigin[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [selectedOrigin, setSelectedOrigin] = useState<ClientOrigin | null>(
		null
	)
	const [mode, setMode] = useState<'create' | 'edit'>('create')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const loadOrigins = async () => {
		try {
			setIsLoading(true)
			const response = await fetch('/api/admin/client-origins')
			const data = await response.json()
			if (response.ok) {
				setOrigins(data.origins || [])
			} else {
				toast.error('Error al cargar orígenes de cliente', {
					description: data.error || 'Ocurrió un error inesperado',
				})
			}
		} catch (error) {
			console.error('Error loading client origins:', error)
			toast.error('Error al cargar orígenes de cliente')
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		loadOrigins()
	}, [])

	const handleCreate = () => {
		setSelectedOrigin(null)
		setMode('create')
		setIsModalOpen(true)
	}

	const handleEdit = (origin: ClientOrigin) => {
		setSelectedOrigin(origin)
		setMode('edit')
		setIsModalOpen(true)
	}

	const handleDelete = (origin: ClientOrigin) => {
		setSelectedOrigin(origin)
		setIsDeleteModalOpen(true)
	}

	const handleSubmit = async (data: Record<string, unknown>) => {
		const formData = data
		try {
			setIsSubmitting(true)
			const url =
				mode === 'create'
					? '/api/admin/client-origins'
					: `/api/admin/client-origins/${selectedOrigin?.idClientOrigin}`

			const method = mode === 'create' ? 'POST' : 'PUT'

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...formData,
					description:
						formData.description === '' ? undefined : formData.description,
				}),
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(
					result.details || result.error || 'Error al guardar origen de cliente'
				)
			}

			toast.success(
				mode === 'create'
					? 'Origen de cliente creado exitosamente'
					: 'Origen de cliente actualizado exitosamente'
			)

			setIsModalOpen(false)
			setSelectedOrigin(null)
			loadOrigins()
		} catch (error) {
			console.error('Error saving client origin:', error)
			toast.error('Error al guardar origen de cliente', {
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
		if (!selectedOrigin) return

		try {
			setIsSubmitting(true)
			const response = await fetch(
				`/api/admin/client-origins/${selectedOrigin.idClientOrigin}`,
				{
					method: 'DELETE',
				}
			)

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Error al eliminar origen de cliente')
			}

			toast.success('Origen de cliente eliminado exitosamente')
			setIsDeleteModalOpen(false)
			setSelectedOrigin(null)
			loadOrigins()
		} catch (error) {
			console.error('Error deleting client origin:', error)
			toast.error('Error al eliminar origen de cliente', {
				description:
					error instanceof Error
						? error.message
						: 'Ocurrió un error inesperado',
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	const columns: CrudTableColumn<ClientOrigin>[] = [
		{
			key: 'idClientOrigin',
			header: 'ID',
			cellRenderer: (value) => (
				<span className="font-medium">#{String(value)}</span>
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
			key: 'description',
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
					{(value as boolean) ? 'Activo' : 'Inactivo'}
				</Badge>
			),
		},
	]

	const fields: CrudModalField[] = [
		{
			name: 'name',
			label: 'Nombre',
			type: 'text',
			placeholder: 'Ej: Referido',
			required: true,
		},
		{
			name: 'description',
			label: 'Descripción',
			type: 'textarea',
			placeholder: 'Información adicional sobre el origen',
			required: false,
		},
		{
			name: 'status',
			label: 'Activo',
			type: 'switch',
			required: false,
			description:
				'Inactiva el origen para que no esté disponible al registrar clientes.',
		},
	]

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-semibold">Orígenes de Cliente</h2>
					<p className="text-muted-foreground mt-1">
						Define los orígenes disponibles para los clientes registrados
					</p>
				</div>
				<Button onClick={handleCreate} className="gap-2">
					<Plus className="h-4 w-4" />
					Crear Origen
				</Button>
			</div>

			<CrudTable
				data={origins}
				columns={columns}
				onEdit={handleEdit}
				onDelete={handleDelete}
				isLoading={isLoading}
				searchable
				emptyMessage="No hay orígenes de cliente registrados"
			/>

			<CrudModal
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
				title={
					mode === 'create'
						? 'Crear Origen de Cliente'
						: 'Editar Origen de Cliente'
				}
				description={
					mode === 'create'
						? 'Completa el formulario para registrar un nuevo origen de cliente'
						: 'Modifica los datos del origen de cliente seleccionado'
				}
				fields={fields}
				schema={
					mode === 'create'
						? createClientOriginSchema
						: updateClientOriginSchema
				}
				initialData={
					mode === 'edit' && selectedOrigin
						? {
								name: selectedOrigin.name,
								description: selectedOrigin.description || '',
								status: selectedOrigin.status,
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
				itemName={selectedOrigin?.name || ''}
				onConfirm={handleDeleteConfirm}
				isLoading={isSubmitting}
			/>
		</div>
	)
}

export default function OriginsAdminPage() {
	return (
		<DashboardLayout currentPage="Orígenes">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">Orígenes</h1>
					<p className="text-muted-foreground mt-2">
						Gestiona los orígenes de productos y clientes utilizados en el
						sistema
					</p>
				</div>

				<Tabs defaultValue="product" className="space-y-4">
					<TabsList>
						<TabsTrigger value="product">Orígenes de Producto</TabsTrigger>
						<TabsTrigger value="client">Orígenes de Cliente</TabsTrigger>
					</TabsList>
					<TabsContent value="product">
						<ProductOriginsSection />
					</TabsContent>
					<TabsContent value="client">
						<ClientOriginsSection />
					</TabsContent>
				</Tabs>
			</div>
		</DashboardLayout>
	)
}
