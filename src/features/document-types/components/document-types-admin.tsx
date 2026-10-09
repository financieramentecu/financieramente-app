'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import {
	CrudModal,
	type CrudModalField,
} from '@/features/admin/shared/CrudModal'
import { DocumentTypesTable } from '@/features/document-types/components/document-types-table'
import { useDocumentTypeMutations } from '@/features/document-types/hooks/use-document-type-mutations'
import { useDocumentTypes } from '@/features/document-types/hooks/use-document-types'
import {
	DOCUMENT_DATA_TYPE_LABELS,
	DOCUMENT_DATA_TYPES,
} from '@/features/document-types/lib/document-data-type'
import { documentTypeFormSchema } from '@/features/document-types/lib/document-type-schemas'
import { lengthRangeError } from '@/features/document-types/lib/length-range'
import type { DocumentTypeDto } from '@/features/document-types/types/document-type.types'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { Button } from '@/features/shared/ui/button'

const fields: CrudModalField[] = [
	{
		name: 'name',
		label: 'Nombre',
		type: 'text',
		placeholder: 'Ej: Cédula de Ciudadanía',
		required: true,
	},
	{
		name: 'code',
		label: 'Abreviatura / Código',
		type: 'text',
		placeholder: 'Ej: CC',
		required: true,
	},
	{
		name: 'dataType',
		label: 'Tipo de dato',
		type: 'select',
		required: true,
		placeholder: 'Seleccionar',
		options: [
			{
				value: DOCUMENT_DATA_TYPES.NUMERIC,
				label: DOCUMENT_DATA_TYPE_LABELS.NUMERIC,
			},
			{
				value: DOCUMENT_DATA_TYPES.ALPHANUMERIC,
				label: DOCUMENT_DATA_TYPE_LABELS.ALPHANUMERIC,
			},
		],
	},
	{
		name: 'minLength',
		label: 'Longitud mínima',
		type: 'number',
		placeholder: 'Ej: 6',
		required: true,
	},
	{
		name: 'maxLength',
		label: 'Longitud máxima',
		type: 'number',
		placeholder: 'Ej: 10',
		required: true,
	},
	{
		name: 'status',
		label: 'Estado',
		type: 'switch',
		description:
			'Activo: disponible en nuevos negocios. Inactivo: se conserva para identificaciones ya registradas.',
	},
]

export function DocumentTypesAdmin() {
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [selected, setSelected] = useState<DocumentTypeDto | null>(null)
	const [mode, setMode] = useState<'create' | 'edit'>('create')
	const { documentTypes, isLoading, refresh } = useDocumentTypes()
	const { createDocumentType, updateDocumentType, isSubmitting } =
		useDocumentTypeMutations()

	const handleCreate = () => {
		setSelected(null)
		setMode('create')
		setIsModalOpen(true)
	}

	const handleEdit = (documentType: DocumentTypeDto) => {
		setSelected(documentType)
		setMode('edit')
		setIsModalOpen(true)
	}

	const handleToggleStatus = async (documentType: DocumentTypeDto) => {
		try {
			await updateDocumentType(documentType.idDocumentType, {
				status: !documentType.status,
			})
			await refresh()
		} catch {
			// The mutation hook already shows the error toast.
		}
	}

	const handleSubmit = async (formData: Record<string, unknown>) => {
		const payload = {
			name: String(formData.name),
			code: String(formData.code),
			dataType: formData.dataType as DocumentTypeDto['dataType'],
			minLength: Number(formData.minLength),
			maxLength: Number(formData.maxLength),
			status: Boolean(formData.status),
		}
		const rangeError = lengthRangeError(payload.minLength, payload.maxLength)
		if (rangeError) {
			toast.error(rangeError)
			throw new Error(rangeError)
		}

		if (mode === 'create') {
			await createDocumentType(payload)
		} else if (selected) {
			await updateDocumentType(selected.idDocumentType, payload)
		}

		setIsModalOpen(false)
		setSelected(null)
		await refresh()
	}

	return (
		<DashboardLayout currentPage="Tipos de Documento">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Tipos de Documento</h1>
						<p className="text-muted-foreground mt-2">
							Parametriza los documentos de identidad usados en el formulario
							de negocios
						</p>
					</div>
					<Button onClick={handleCreate} className="gap-2">
						<Plus className="h-4 w-4" />
						Crear tipo de documento
					</Button>
				</div>

				<DocumentTypesTable
					documentTypes={documentTypes}
					isLoading={isLoading}
					onEdit={handleEdit}
					onToggleStatus={handleToggleStatus}
				/>

				<CrudModal
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
					title={
						mode === 'create'
							? 'Crear tipo de documento'
							: 'Editar tipo de documento'
					}
					description="Nombre, abreviatura, tipo de dato y longitudes son obligatorios. La abreviatura y el nombre no pueden repetirse."
					fields={fields}
					schema={documentTypeFormSchema}
					initialData={
						mode === 'edit' && selected
							? {
									name: selected.name,
									code: selected.code,
									dataType: selected.dataType,
									minLength: selected.minLength,
									maxLength: selected.maxLength,
									status: selected.status,
								}
							: { status: true, dataType: DOCUMENT_DATA_TYPES.NUMERIC }
					}
					onSubmit={handleSubmit}
					mode={mode}
					isLoading={isSubmitting}
				/>
			</div>
		</DashboardLayout>
	)
}
