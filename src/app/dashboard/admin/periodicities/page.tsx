'use client'

import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { CrudTable, type CrudTableColumn } from '@/components/admin/CrudTable'
import { CrudModal, type CrudModalField } from '@/components/admin/CrudModal'
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
	buyPeriodicitySchema,
	type BuyPeriodicityFormData,
} from '@/lib/admin/schemas'

interface Periodicity extends Record<string, unknown> {
	idBuyPeriodicity: number
	name: string
	active: boolean
	createdAt: string
	updatedAt: string
}

export default function PeriodicitiesAdminPage() {
	const [periodicities, setPeriodicities] = useState<Periodicity[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [selectedPeriodicity, setSelectedPeriodicity] =
		useState<Periodicity | null>(null)
	const [mode, setMode] = useState<'create' | 'edit'>('create')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const loadPeriodicities = async () => {
		try {
			setIsLoading(true)
			const response = await fetch('/api/admin/periodicities')
			const data = await response.json()
			if (response.ok) {
				setPeriodicities(data.periodicities || [])
			} else {
				toast.error('Error al cargar periodicidades', {
					description: data.error || 'Ocurrió un error inesperado',
				})
			}
		} catch (error) {
			console.error('Error loading periodicities:', error)
			toast.error('Error al cargar periodicidades')
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		loadPeriodicities()
	}, [])

	const handleCreate = () => {
		setSelectedPeriodicity(null)
		setMode('create')
		setIsModalOpen(true)
	}

	const handleEdit = (periodicity: Periodicity) => {
		setSelectedPeriodicity(periodicity)
		setMode('edit')
		setIsModalOpen(true)
	}

	const handleDelete = (periodicity: Periodicity) => {
		setSelectedPeriodicity(periodicity)
		setIsDeleteModalOpen(true)
	}

	const handleSubmit = async (data: Record<string, unknown>) => {
		const formData = data as BuyPeriodicityFormData
		try {
			setIsSubmitting(true)
			const url =
				mode === 'create'
					? '/api/admin/periodicities'
					: `/api/admin/periodicities/${selectedPeriodicity?.idBuyPeriodicity}`

			const method = mode === 'create' ? 'POST' : 'PUT'

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData),
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(
					result.details || result.error || 'Error al guardar periodicidad'
				)
			}

			toast.success(
				mode === 'create'
					? 'Periodicidad creada exitosamente'
					: 'Periodicidad actualizada exitosamente'
			)

			setIsModalOpen(false)
			setSelectedPeriodicity(null)
			loadPeriodicities()
		} catch (error) {
			console.error('Error saving periodicity:', error)
			toast.error('Error al guardar periodicidad', {
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
		if (!selectedPeriodicity) return

		try {
			setIsSubmitting(true)
			const response = await fetch(
				`/api/admin/periodicities/${selectedPeriodicity.idBuyPeriodicity}`,
				{
					method: 'DELETE',
				}
			)

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Error al eliminar periodicidad')
			}

			toast.success('Periodicidad eliminada exitosamente')
			setIsDeleteModalOpen(false)
			setSelectedPeriodicity(null)
			loadPeriodicities()
		} catch (error) {
			console.error('Error deleting periodicity:', error)
			toast.error('Error al eliminar periodicidad', {
				description:
					error instanceof Error
						? error.message
						: 'Ocurrió un error inesperado',
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	const columns: CrudTableColumn<Periodicity>[] = [
		{
			key: 'idBuyPeriodicity',
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
			key: 'active',
			header: 'Estado',
			cellRenderer: (value) => (
				<Badge variant={(value as boolean) ? 'success' : 'neutral'}>
					{(value as boolean) ? 'Activa' : 'Inactiva'}
				</Badge>
			),
		},
	]

	const fields: CrudModalField[] = [
		{
			name: 'name',
			label: 'Nombre',
			type: 'text',
			placeholder: 'Ej: Mensual',
			required: true,
		},
		{
			name: 'active',
			label: 'Activo',
			type: 'switch',
			required: false,
			description:
				'Inactiva la periodicidad para evitar que nuevos registros la utilicen.',
		},
	]

	return (
		<DashboardLayout currentPage="Periodicidades">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Periodicidades de Compra</h1>
						<p className="text-muted-foreground mt-2">
							Configura las periodicidades disponibles para los contratos
						</p>
					</div>
					<Button onClick={handleCreate} className="gap-2">
						<Plus className="h-4 w-4" />
						Crear Periodicidad
					</Button>
				</div>

				<CrudTable
					data={periodicities}
					columns={columns}
					onEdit={handleEdit}
					onDelete={handleDelete}
					isLoading={isLoading}
					searchable
					emptyMessage="No hay periodicidades registradas"
				/>

				<CrudModal
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
					title={
						mode === 'create' ? 'Crear Periodicidad' : 'Editar Periodicidad'
					}
					description={
						mode === 'create'
							? 'Define una nueva periodicidad para las compras'
							: 'Modifica los datos de la periodicidad seleccionada'
					}
					fields={fields}
					schema={buyPeriodicitySchema}
					initialData={
						mode === 'edit' && selectedPeriodicity
							? {
									name: selectedPeriodicity.name,
									active: selectedPeriodicity.active,
								}
							: {
									active: true,
								}
					}
					onSubmit={handleSubmit}
					mode={mode}
					isLoading={isSubmitting}
				/>

				<DeleteConfirmModal
					open={isDeleteModalOpen}
					onOpenChange={setIsDeleteModalOpen}
					itemName={selectedPeriodicity?.name || ''}
					onConfirm={handleDeleteConfirm}
					isLoading={isSubmitting}
				/>
			</div>
		</DashboardLayout>
	)
}
