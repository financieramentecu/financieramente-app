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
import { CompaniesTable } from '@/features/admin/companies/components/companies-table'
import { useCompanies } from '@/features/admin/companies/hooks/use-companies'
import { useCompanyMutations } from '@/features/admin/companies/hooks/use-company-mutations'
import {
	createCompanySchema,
	updateCompanySchema,
} from '@/features/admin/companies/lib/company-schemas'
import type { Company } from '@/features/admin/companies/types/company.types'

export default function CompaniesAdminPage() {
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
	const [mode, setMode] = useState<'create' | 'edit'>('create')

	const { companies, isLoading, refreshCompanies } = useCompanies()
	const { createCompany, updateCompany, deleteCompany, isSubmitting } =
		useCompanyMutations()

	const handleCreate = () => {
		setSelectedCompany(null)
		setMode('create')
		setIsModalOpen(true)
	}

	const handleEdit = (company: Company) => {
		setSelectedCompany(company)
		setMode('edit')
		setIsModalOpen(true)
	}

	const handleDelete = (company: Company) => {
		setSelectedCompany(company)
		setIsDeleteModalOpen(true)
	}

	const handleSubmit = async (formData: Record<string, unknown>) => {
		try {
			if (mode === 'create') {
				await createCompany({
					name: formData.name as string,
					idTypeCompany: formData.idTypeCompany as 'NACIONAL' | 'INTERNACIONAL',
					status: formData.status as boolean,
				})
			} else if (selectedCompany) {
				await updateCompany(selectedCompany.idCompany, {
					name: formData.name as string,
					idTypeCompany: formData.idTypeCompany as 'NACIONAL' | 'INTERNACIONAL',
					status: formData.status as boolean,
				})
			}

			setIsModalOpen(false)
			setSelectedCompany(null)
			refreshCompanies()
		} catch {
			// Error ya manejado en el hook
		}
	}

	const handleDeleteConfirm = async () => {
		if (!selectedCompany) return

		try {
			await deleteCompany(selectedCompany.idCompany)
			setIsDeleteModalOpen(false)
			setSelectedCompany(null)
			refreshCompanies()
		} catch {
			// Error ya manejado en el hook
		}
	}

	const fields: CrudModalField[] = [
		{
			name: 'name',
			label: 'Nombre',
			type: 'text',
			placeholder: 'Ej: Skandia',
			required: true,
		},
		{
			name: 'idTypeCompany',
			label: 'Tipo de Compañía',
			type: 'enum',
			enumValues: ['NACIONAL', 'INTERNACIONAL'],
			required: true,
		},
		{
			name: 'status',
			label: 'Activo',
			type: 'switch',
			required: false,
			description:
				'Controla si la compañía está disponible para nuevas operaciones.',
		},
	]

	return (
		<DashboardLayout currentPage="Compañías">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Compañías</h1>
						<p className="text-muted-foreground mt-2">
							Gestiona las compañías aseguradoras del sistema
						</p>
					</div>
					<Button onClick={handleCreate} className="gap-2">
						<Plus className="h-4 w-4" />
						Crear Compañía
					</Button>
				</div>

				<CompaniesTable
					companies={companies}
					isLoading={isLoading}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>

				<CrudModal
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
					title={mode === 'create' ? 'Crear Compañía' : 'Editar Compañía'}
					description={
						mode === 'create'
							? 'Completa el formulario para crear una nueva compañía'
							: 'Modifica los datos de la compañía'
					}
					fields={fields}
					schema={mode === 'create' ? createCompanySchema : updateCompanySchema}
					initialData={
						mode === 'edit' && selectedCompany
							? {
									name: selectedCompany.name,
									idTypeCompany: selectedCompany.idTypeCompany,
									status: selectedCompany.status,
								}
							: {
									idTypeCompany: 'NACIONAL',
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
					itemName={selectedCompany?.name || ''}
					onConfirm={handleDeleteConfirm}
					isLoading={isSubmitting}
				/>
			</div>
		</DashboardLayout>
	)
}
