'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Calculator, Mail, Users } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'

import { Button } from '@/features/shared/ui/button'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import type { ArchivoDisponible } from '@/features/pre-liquidacion/types/types'

interface ListaArchivosDisponiblesProps {
	archivos: ArchivoDisponible[]
	onPreliquidar?: (archivo: ArchivoDisponible) => void
	onNotificar?: (fileId: number) => Promise<boolean>
}

/**
 * Tabla de archivos disponibles; acceso al detalle para liquidar/rezagar por registro.
 * Migrada a DataTable reutilizable.
 */
export function ListaArchivosDisponibles({
	archivos,
	onPreliquidar,
	onNotificar,
}: ListaArchivosDisponiblesProps) {
	const router = useRouter()

	const columns = useMemo<ColumnDef<ArchivoDisponible>[]>(
		() => [
			{
				accessorKey: 'nombreArchivo',
				header: 'Nombre del Archivo',
				cell: ({ row }) => (
					<span className="font-medium">{row.original.nombreArchivo}</span>
				),
			},
			{
				accessorKey: 'usuarioCargo',
				header: 'Usuario que Cargó',
			},
			{
				accessorKey: 'fechaCarga',
				header: 'Fecha de Carga',
			},
			{
				accessorKey: 'registrosPreliquidados',
				header: 'Cantidad de Registros',
				cell: ({ row }) => {
					const count =
						row.original.registrosPreliquidados || row.original.sincronizados
					return <span>{count ?? 0} registros</span>
				},
			},
			{
				id: 'aprobaciones',
				header: () => (
					<div className="text-center inline-flex items-center gap-1">
						<Users className="h-3.5 w-3.5" />
						Aprob.
					</div>
				),
				cell: ({ row }) => {
					const total = row.original.totalBeneficiarios ?? 0
					const aprobados = row.original.aprobaciones ?? 0
					if (total === 0) {
						return (
							<div className="text-center text-xs text-muted-foreground">—</div>
						)
					}
					const complete = aprobados >= total
					return (
						<div
							className={`text-center text-xs font-medium tabular-nums ${
								complete ? 'text-emerald-700' : 'text-amber-700'
							}`}
							title={`${aprobados} de ${total} beneficiarios aprobaron la pre-liquidación`}
						>
							{aprobados}/{total}
						</div>
					)
				},
			},
			{
				accessorKey: 'estado',
				header: 'Estado',
				cell: ({ row }) => {
					const status = row.original.estado
					if (status === 'LOAD') {
						return (
							<span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
								Sincronizado
							</span>
						)
					}
					if (status === 'PRE-SETTLED') {
						return (
							<span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10">
								Pre-liquidado
							</span>
						)
					}
					if (status === 'PRE-SETTLE-APROVED') {
						return (
							<span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
								Pre-liquidación Aprobada
							</span>
						)
					}
					if (status === 'SETTLED') {
						return (
							<span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
								Liquidado
							</span>
						)
					}
					if (status === 'COMPLETED') {
						return (
							<span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-700/10">
								Completado
							</span>
						)
					}
					return <span>{status}</span>
				},
			},
			{
				id: 'actions',
				header: () => <div className="text-right">Acciones</div>,
				cell: ({ row }) => {
					const archivo = row.original
					const hasRegistros =
						archivo.sincronizados > 0 ||
						(archivo.registrosPreliquidados ?? 0) > 0

					if (!hasRegistros) {
						return (
							<div className="text-right">
								<span className="text-sm text-muted-foreground">—</span>
							</div>
						)
					}

					return (
						<div className="text-right flex items-center justify-end gap-2">
							{archivo.estado === 'LOAD' && (
								<Button
									variant="default"
									size="sm"
									onClick={() => onPreliquidar?.(archivo)}
									className="cursor-pointer bg-primary hover:bg-primary/90"
								>
									<Calculator className="h-4 w-4 mr-2" />
									Pre-Liquidar
								</Button>
							)}
							{(archivo.estado === 'PRE-SETTLED' ||
								archivo.estado === 'PRE-SETTLE-APROVED' ||
								archivo.estado === 'SETTLED' ||
								archivo.estado === 'COMPLETED') && (
								<Button
									variant="default"
									size="sm"
									onClick={() => onNotificar?.(archivo.idFileImport)}
									className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
								>
									<Mail className="h-4 w-4 mr-2" />
									Notificar
								</Button>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									router.push(
										`/dashboard/pre-liquidacion/${archivo.idFileImport}`
									)
								}
								className="cursor-pointer"
							>
								<Eye className="h-4 w-4 mr-2" />
								Ver Detalle
							</Button>
						</div>
					)
				},
			},
		],
		[router, onNotificar, onPreliquidar]
	)

	return (
		<DataTable
			columns={columns}
			data={archivos}
			searchable
			searchColumn="nombreArchivo"
			searchPlaceholder="Buscar por nombre de archivo..."
		/>
	)
}
