'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import {
	CrudModal,
	type CrudModalField,
} from '@/features/admin/shared/CrudModal'
import { DeleteConfirmModal } from '@/features/admin/shared/DeleteConfirmModal'
import { Button } from '@/features/shared/ui/button'
import { PeriodicitiesTable } from '@/features/admin/periodicities/components/periodicities-table'
import { usePeriodicities } from '@/features/admin/periodicities/hooks/use-periodicities'
import { usePeriodicityMutations } from '@/features/admin/periodicities/hooks/use-periodicity-mutations'
import {
	createPeriodicitySchema,
	updatePeriodicitySchema,
} from '@/features/admin/periodicities/lib/periodicity-schemas'
import type { Periodicity } from '@/features/admin/periodicities/types/periodicity.types'

export default function PeriodicitiesAdminPage() {
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [selectedPeriodicity, setSelectedPeriodicity] =
		useState<Periodicity | null>(null)
	const [mode, setMode] = useState<'create' | 'edit'>('create')

	const { periodicities, isLoading, refreshPeriodicities } = usePeriodicities()
	const {
		createPeriodicity,
		updatePeriodicity,
		deletePeriodicity,
		isSubmitting,
	} = usePeriodicityMutations()

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

	const handleSubmit = async (formData: Record<string, unknown>) => {
		try {
			if (mode === 'create') {
				await createPeriodicity({
					name: formData.name as string,
					active: formData.active as boolean,
				})
			} else if (selectedPeriodicity) {
				await updatePeriodicity(selectedPeriodicity.idBuyPeriodicity, {
					name: formData.name as string,
					active: formData.active as boolean,
				})
			}

			setIsModalOpen(false)
			setSelectedPeriodicity(null)
			refreshPeriodicities()
		} catch {
			// Error ya manejado en el hook
		}
	}

	const handleDeleteConfirm = async () => {
		if (!selectedPeriodicity) return

		try {
			await deletePeriodicity(selectedPeriodicity.idBuyPeriodicity)
			setIsDeleteModalOpen(false)
			setSelectedPeriodicity(null)
			refreshPeriodicities()
		} catch {
			// Error ya manejado en el hook
		}
	}

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
				'Define si la periodicidad puede ser seleccionada al crear negocios.',
		},
	]

	return (
		<DashboardLayout currentPage="Periodicidades">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Periodicidades</h1>
						<p className="text-muted-foreground mt-2">
							Gestiona las periodicidades de compra disponibles
						</p>
					</div>
					<Button onClick={handleCreate} className="gap-2">
						<Plus className="h-4 w-4" />
						Crear Periodicidad
					</Button>
				</div>

				<PeriodicitiesTable
					periodicities={periodicities}
					isLoading={isLoading}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>

				<CrudModal
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
					title={
						mode === 'create' ? 'Crear Periodicidad' : 'Editar Periodicidad'
					}
					description={
						mode === 'create'
							? 'Completa el formulario para registrar una nueva periodicidad'
							: 'Modifica los datos de la periodicidad seleccionada'
					}
					fields={fields}
					schema={
						mode === 'create'
							? createPeriodicitySchema
							: updatePeriodicitySchema
					}
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
