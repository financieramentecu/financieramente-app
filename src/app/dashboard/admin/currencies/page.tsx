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
import { CurrenciesTable } from '@/features/admin/currencies/components/currencies-table'
import { useCurrencies } from '@/features/admin/currencies/hooks/use-currencies'
import { useCurrencyMutations } from '@/features/admin/currencies/hooks/use-currency-mutations'
import {
	createCurrencySchema,
	updateCurrencySchema,
} from '@/features/admin/currencies/lib/currency-schemas'
import type { Currency } from '@/features/admin/currencies/types/currency.types'

export default function CurrenciesAdminPage() {
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(
		null
	)
	const [mode, setMode] = useState<'create' | 'edit'>('create')

	const { currencies, isLoading, refreshCurrencies } = useCurrencies()
	const { createCurrency, updateCurrency, deleteCurrency, isSubmitting } =
		useCurrencyMutations()

	const handleCreate = () => {
		setSelectedCurrency(null)
		setMode('create')
		setIsModalOpen(true)
	}

	const handleEdit = (currency: Currency) => {
		setSelectedCurrency(currency)
		setMode('edit')
		setIsModalOpen(true)
	}

	const handleDelete = (currency: Currency) => {
		setSelectedCurrency(currency)
		setIsDeleteModalOpen(true)
	}

	const handleSubmit = async (formData: Record<string, unknown>) => {
		try {
			if (mode === 'create') {
				await createCurrency({
					name: formData.name as string,
					symbol: formData.symbol as string | undefined,
					active: formData.active as boolean,
				})
			} else if (selectedCurrency) {
				await updateCurrency(selectedCurrency.idCurrency, {
					name: formData.name as string,
					symbol: formData.symbol as string | undefined,
					active: formData.active as boolean,
				})
			}

			setIsModalOpen(false)
			setSelectedCurrency(null)
			refreshCurrencies()
		} catch {
			// Error ya manejado en el hook
		}
	}

	const handleDeleteConfirm = async () => {
		if (!selectedCurrency) return

		try {
			await deleteCurrency(selectedCurrency.idCurrency)
			setIsDeleteModalOpen(false)
			setSelectedCurrency(null)
			refreshCurrencies()
		} catch {
			// Error ya manejado en el hook
		}
	}

	const fields: CrudModalField[] = [
		{
			name: 'name',
			label: 'Nombre',
			type: 'text',
			placeholder: 'Ej: Peso Colombiano',
			required: true,
		},
		{
			name: 'symbol',
			label: 'Símbolo',
			type: 'text',
			placeholder: 'Ej: COP',
			required: false,
		},
		{
			name: 'active',
			label: 'Activo',
			type: 'switch',
			required: false,
			description:
				'Define si la moneda puede ser seleccionada al crear negocios.',
		},
	]

	return (
		<DashboardLayout currentPage="Monedas">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Monedas</h1>
						<p className="text-muted-foreground mt-2">
							Gestiona las monedas disponibles para los negocios
						</p>
					</div>
					<Button onClick={handleCreate} className="gap-2">
						<Plus className="h-4 w-4" />
						Crear Moneda
					</Button>
				</div>

				<CurrenciesTable
					currencies={currencies}
					isLoading={isLoading}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>

				<CrudModal
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
					title={mode === 'create' ? 'Crear Moneda' : 'Editar Moneda'}
					description={
						mode === 'create'
							? 'Completa el formulario para registrar una nueva moneda'
							: 'Modifica los datos de la moneda seleccionada'
					}
					fields={fields}
					schema={
						mode === 'create' ? createCurrencySchema : updateCurrencySchema
					}
					initialData={
						mode === 'edit' && selectedCurrency
							? {
									name: selectedCurrency.name,
									symbol: selectedCurrency.symbol || '',
									active: selectedCurrency.active,
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
					itemName={selectedCurrency?.name || ''}
					onConfirm={handleDeleteConfirm}
					isLoading={isSubmitting}
				/>
			</div>
		</DashboardLayout>
	)
}
