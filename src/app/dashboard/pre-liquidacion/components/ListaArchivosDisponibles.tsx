'use client'

import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import type { ArchivoDisponible } from '@/features/pre-liquidacion/types/types'

interface ListaArchivosDisponiblesProps {
	archivos: ArchivoDisponible[]
}

/**
 * Tabla de archivos disponibles; acceso al detalle para liquidar/rezagar por registro.
 */
export function ListaArchivosDisponibles({
	archivos,
}: ListaArchivosDisponiblesProps) {
	const router = useRouter()

	return (
		<div className="overflow-x-auto">
			<table className="w-full">
				<thead>
					<tr className="border-b border-border">
						<th
							className="text-left py-3 px-4 text-sm font-semibold text-foreground"
							scope="col"
						>
							Nombre del Archivo
						</th>
						<th
							className="text-left py-3 px-4 text-sm font-semibold text-foreground"
							scope="col"
						>
							Usuario que Cargó
						</th>
						<th
							className="text-left py-3 px-4 text-sm font-semibold text-foreground"
							scope="col"
						>
							Fecha de Carga
						</th>
						<th
							className="text-left py-3 px-4 text-sm font-semibold text-foreground"
							scope="col"
						>
							Cantidad de Registros
						</th>
						<th
							className="text-right py-3 px-4 text-sm font-semibold text-foreground"
							scope="col"
						>
							Acciones
						</th>
					</tr>
				</thead>
				<tbody>
					{archivos.map((archivo) => (
						<tr
							key={archivo.idFileImport}
							className="border-b border-border hover:bg-muted/50"
						>
							<td className="py-3 px-4 text-sm font-medium text-foreground">
								{archivo.nombreArchivo}
							</td>
							<td className="py-3 px-4 text-sm text-muted-foreground">
								{archivo.usuarioCargo}
							</td>
							<td className="py-3 px-4 text-sm text-muted-foreground">
								{archivo.fechaCarga}
							</td>
							<td className="py-3 px-4 text-sm text-muted-foreground">
								{archivo.cantidadRegistros} registros
							</td>
							<td className="py-3 px-4 text-right">
								{archivo.sincronizados > 0 ? (
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
								) : (
									<span className="text-sm text-muted-foreground">—</span>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
