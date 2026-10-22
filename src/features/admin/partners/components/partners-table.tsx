'use client'

import { LogIn, Mail, Pencil, Power, RotateCcw } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { DataTableColumnHeader } from '@/features/shared/ui/DataTable/DataTableColumnHeader'
import { Button } from '@/features/shared/ui/button'
import { formatDateBogota } from '@/features/shared/lib/format-date'
import type {
	PartnerAction,
	PendingPartnerAction,
} from '../hooks/use-partner-actions'
import type { PartnerDto } from '../types/partner.types'
import { PartnerStatusBadge } from './partner-status-badge'

interface PartnersTableProps {
	partners: PartnerDto[]
	isLoading: boolean
	pending: PendingPartnerAction | null
	onAction: (action: PartnerAction, partner: PartnerDto) => void
	onEdit: (partner: PartnerDto) => void
	/** Provided only when the "Ver como" feature flag is on. */
	onImpersonate?: (partner: PartnerDto) => void
}

function fullName(partner: { name: string; lastName: string | null }) {
	return `${partner.name} ${partner.lastName ?? ''}`.trim()
}

const COLUMNS: ColumnDef<PartnerDto>[] = [
	{
		id: 'name',
		accessorFn: (row) => fullName(row),
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Nombre Completo" />
		),
		cell: ({ row }) => (
			<span className="font-medium">{fullName(row.original)}</span>
		),
	},
	{
		accessorKey: 'email',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Email" />
		),
		cell: ({ row }) => (
			<span className="text-muted-foreground">{row.original.email}</span>
		),
	},
	{
		id: 'leader',
		accessorFn: (row) => (row.leader ? fullName(row.leader) : ''),
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Líder" />
		),
		cell: ({ row }) =>
			row.original.leader ? (
				<span className="text-sm font-medium">
					{fullName(row.original.leader)}
				</span>
			) : (
				<span className="text-xs text-muted-foreground italic">Sin líder</span>
			),
	},
	{
		accessorKey: 'status',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Estado" />
		),
		cell: ({ row }) => <PartnerStatusBadge status={row.original.status} />,
	},
	{
		accessorKey: 'createdAt',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Fecha Creación" />
		),
		cell: ({ row }) => (
			<span className="text-muted-foreground">
				{formatDateBogota(row.original.createdAt)}
			</span>
		),
	},
]

export function PartnersTable({
	partners,
	isLoading,
	pending,
	onAction,
	onEdit,
	onImpersonate,
}: PartnersTableProps) {
	return (
		<DataTable
			columns={COLUMNS}
			data={partners}
			loading={isLoading}
			searchable={true}
			searchColumn="name"
			searchPlaceholder="Buscar por nombre..."
			emptyMessage="No se encontraron partners"
			actions={(partner) => {
				const busy = pending?.id === partner.id
				return (
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							className="gap-2 h-8"
							disabled={busy}
							onClick={() => onEdit(partner)}
						>
							<Pencil className="h-4 w-4" />
							Editar
						</Button>
						{partner.status === 'PENDING' && (
							<Button
								variant="outline"
								size="sm"
								className="gap-2 h-8"
								disabled={busy}
								onClick={() => onAction('resend', partner)}
							>
								<Mail className="h-4 w-4" />
								Reenviar activación
							</Button>
						)}
						{partner.status !== 'DEACTIVATED' && (
							<Button
								variant="ghost"
								size="sm"
								className="gap-2 h-8 text-destructive"
								disabled={busy}
								onClick={() => onAction('deactivate', partner)}
							>
								<Power className="h-4 w-4" />
								Desactivar
							</Button>
						)}
						{partner.status === 'DEACTIVATED' && (
							<Button
								variant="outline"
								size="sm"
								className="gap-2 h-8"
								disabled={busy}
								onClick={() => onAction('reactivate', partner)}
							>
								<RotateCcw className="h-4 w-4" />
								Reactivar
							</Button>
						)}
						{onImpersonate && partner.status !== 'DEACTIVATED' && (
							<Button
								variant="outline"
								size="sm"
								className="gap-2 h-8 border-orange-200 hover:bg-orange-50 hover:text-orange-700 text-orange-600"
								disabled={busy}
								onClick={() => onImpersonate(partner)}
							>
								<LogIn className="h-4 w-4" />
								Ver como
							</Button>
						)}
					</div>
				)
			}}
		/>
	)
}
