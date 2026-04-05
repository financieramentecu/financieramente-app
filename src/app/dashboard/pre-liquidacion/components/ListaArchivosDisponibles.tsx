'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'

import { Button } from '@/features/shared/ui/button'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import type { ArchivoDisponible } from '@/features/pre-liquidacion/types/types'

interface ListaArchivosDisponiblesProps {
	archivos: ArchivoDisponible[]
}

/**
 * Tabla de archivos disponibles; acceso al detalle para liquidar/rezagar por registro.
 * Migrada a DataTable reutilizable.
 */
export function ListaArchivosDisponibles({
	archivos,
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
				cell: ({ row }) => (
					<span>{row.original.registrosPreliquidados ?? 0} registros</span>
				),
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
						<div className="text-right">
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
		[router]
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
