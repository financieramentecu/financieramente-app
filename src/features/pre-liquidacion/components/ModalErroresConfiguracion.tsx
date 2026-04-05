'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
	AlertTriangle,
	ExternalLink,
	User,
	Hash,
	FileText,
	Tag,
	Info,
} from 'lucide-react'
import { Modal } from '@/features/shared/ui/modal'
import { Button } from '@/features/shared/ui/button'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { ColumnDef } from '@tanstack/react-table'
import type { RegistroConError } from '../types/types'

const ERROR_LABELS: Record<string, string> = {
	FIXED_MISSING_USER: 'Usuario fijo no configurado',
	FIXED_USER_INACTIVE: 'Usuario fijo inactivo',
	UPLINE_AGENT_NO_CATEGORY: 'El agente no tiene categoría asignada',
	UPLINE_NO_LEADER: 'El agente no tiene líder asignado',
	UPLINE_LEADER_NO_CATEGORY: 'El líder no tiene categoría asignada',
	UPLINE_NO_MATCH: 'Sin coincidencia en cadena de ventas',
}

interface ModalErroresConfiguracionProps {
	registrosConError: RegistroConError[]
	open: boolean
	onClose: () => void
}

export function ModalErroresConfiguracion({
	registrosConError,
	open,
	onClose,
}: ModalErroresConfiguracionProps) {
	const columns = useMemo<ColumnDef<RegistroConError>[]>(
		() => [
			{
				accessorKey: 'idSettlementCommission',
				header: () => (
					<div className="flex items-center gap-2">
						<Hash className="h-3 w-3" />
						<span># LIQ.</span>
					</div>
				),
				cell: ({ row }) => {
					const id = row.getValue('idSettlementCommission') as number
					const idBusiness = row.original.idBusiness
					if (!idBusiness) {
						return (
							<span className="font-mono text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
								{id}
							</span>
						)
					}
					return (
						<Link
							href={`/dashboard/negocios/editar/${idBusiness}`}
							className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-primary bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded border border-primary/20 transition-colors"
							onClick={onClose}
						>
							{id}
							<ExternalLink className="h-3 w-3 opacity-60" />
						</Link>
					)
				},
			},
			{
				accessorKey: 'contrato',
				header: () => (
					<div className="flex items-center gap-2">
						<FileText className="h-3 w-3" />
						<span>CONTRATO</span>
					</div>
				),
				cell: ({ row }) => (
					<span className="font-mono text-[11px] font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/50">
						{row.getValue('contrato') ?? '—'}
					</span>
				),
			},
			{
				accessorKey: 'userAgentName', // Usaremos un campo de nombre si existe, o el ID
				header: () => (
					<div className="flex items-center gap-2">
						<User className="h-3 w-3" />
						<span>AGENTE</span>
					</div>
				),
				cell: ({ row }) => {
					const idUserAgent = row.original.idUserAgent
					if (!idUserAgent) {
						return <span className="text-muted-foreground text-xs">—</span>
					}
					return (
						<Link
							href={`/dashboard/admin/users/${idUserAgent}`}
							className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/5 hover:bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 transition-colors"
							onClick={onClose}
						>
							<User className="h-3 w-3" />
							Ver agente
							<ExternalLink className="h-3 w-3 opacity-60" />
						</Link>
					)
				},
			},
			{
				accessorKey: 'categoryCode',
				header: () => (
					<div className="flex items-center gap-2">
						<Tag className="h-3 w-3" />
						<span>CATEGORÍA</span>
					</div>
				),
				cell: ({ row }) => (
					<span className="inline-flex items-center rounded-md bg-secondary/50 border border-border px-2 py-0.5 text-[11px] font-bold text-secondary-foreground uppercase tracking-wider">
						{row.getValue('categoryCode')}
					</span>
				),
			},
			{
				accessorKey: 'errorCode',
				header: () => (
					<div className="flex items-center gap-2">
						<Info className="h-3 w-3" />
						<span>MOTIVO DEL ERROR</span>
					</div>
				),
				cell: ({ row }) => {
					const code = row.getValue('errorCode') as string
					return (
						<div className="flex items-center gap-2 text-destructive font-semibold text-xs py-1">
							<AlertTriangle className="h-3.5 w-3.5 shrink-0" />
							<span>{ERROR_LABELS[code] ?? code}</span>
						</div>
					)
				},
			},
		],
		[onClose]
	)

	return (
		<Modal
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose()
			}}
			title="Registros con Errores de Configuración"
			size="xl"
			className="max-w-6xl"
		>
			<div className="space-y-4">
				<div className="flex items-start gap-4 rounded-xl bg-destructive/5 border border-destructive/20 p-5 text-sm text-destructive shadow-sm">
					<div className="rounded-full bg-destructive/10 p-2 shrink-0">
						<AlertTriangle className="h-6 w-6" />
					</div>
					<div className="space-y-1.5 py-1">
						<p className="text-base font-bold leading-none tracking-tight">
							Atención requerida
						</p>
						<p className="text-muted-foreground font-medium leading-relaxed">
							Los siguientes registros no pudieron ser pre-liquidados por
							errores en la configuración del beneficiario. Usá los links para
							ir directo a corregir la configuración y volvé a procesar.
						</p>
					</div>
					<div className="ml-auto bg-destructive/10 px-3 py-1.5 rounded-lg border border-destructive/20 text-xs font-bold whitespace-nowrap">
						{registrosConError.length}{' '}
						{registrosConError.length === 1 ? 'registro' : 'registros'}
					</div>
				</div>

				<div className="rounded-xl border border-border shadow-sm overflow-hidden bg-background">
					<DataTable
						columns={columns}
						data={registrosConError}
						searchable={true}
						searchColumn="contrato"
						searchPlaceholder="Buscar por contrato..."
					/>
				</div>

				<div className="flex justify-end pt-4">
					<Button
						variant="outline"
						onClick={onClose}
						className="px-8 font-semibold"
					>
						Cerrar
					</Button>
				</div>
			</div>
		</Modal>
	)
}
