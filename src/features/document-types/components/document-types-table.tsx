import type { ColumnDef } from '@tanstack/react-table'
import { Pencil } from 'lucide-react'
import { DOCUMENT_DATA_TYPE_LABELS } from '@/features/document-types/lib/document-data-type'
import type { DocumentTypeDto } from '@/features/document-types/types/document-type.types'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { DataTableColumnHeader } from '@/features/shared/ui/DataTable/DataTableColumnHeader'

interface DocumentTypesTableProps {
	documentTypes: DocumentTypeDto[]
	isLoading: boolean
	onEdit: (documentType: DocumentTypeDto) => void
	onToggleStatus: (documentType: DocumentTypeDto) => void
}

export function DocumentTypesTable({
	documentTypes,
	isLoading,
	onEdit,
	onToggleStatus,
}: DocumentTypesTableProps) {
	const columns: ColumnDef<DocumentTypeDto>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Nombre" />
			),
			cell: ({ row }) => (
				<span className="font-medium">{row.getValue('name')}</span>
			),
		},
		{
			accessorKey: 'code',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Abreviatura" />
			),
		},
		{
			accessorKey: 'dataType',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Tipo de dato" />
			),
			cell: ({ row }) =>
				DOCUMENT_DATA_TYPE_LABELS[row.original.dataType],
		},
		{
			id: 'length',
			header: 'Longitud',
			cell: ({ row }) =>
				`${row.original.minLength} – ${row.original.maxLength}`,
		},
		{
			accessorKey: 'status',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Estado" />
			),
			cell: ({ row }) => {
				const active = row.original.status
				return (
					<Badge variant={active ? 'success' : 'neutral'}>
						{active ? 'Activo' : 'Inactivo'}
					</Badge>
				)
			},
		},
	]

	return (
		<DataTable
			data={documentTypes}
			columns={columns}
			loading={isLoading}
			searchable={true}
			searchColumn="name"
			emptyMessage="No hay tipos de documento registrados"
			actions={(documentType) => (
				<>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onEdit(documentType)}
						className="h-8 w-8 p-0"
						aria-label={`Editar ${documentType.name}`}
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onToggleStatus(documentType)}
						aria-label={
							documentType.status
								? `Inactivar ${documentType.name}`
								: `Activar ${documentType.name}`
						}
					>
						{documentType.status ? 'Inactivar' : 'Activar'}
					</Button>
				</>
			)}
		/>
	)
}
