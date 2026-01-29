'use client'

import { Calculator } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import type { ArchivoDisponible } from '@/features/pre-liquidacion/types/types'

interface ListaArchivosDisponiblesProps {
    archivos: ArchivoDisponible[]
    onPreLiquidar: (fileId: number) => void
    isProcesando: boolean
}

/**
 * Tabla de archivos disponibles para pre-liquidar
 */
export function ListaArchivosDisponibles({
    archivos,
    onPreLiquidar,
    isProcesando,
}: ListaArchivosDisponiblesProps) {

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground" scope="col">
                            Nombre del Archivo
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground" scope="col">
                            Usuario que Cargó
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground" scope="col">
                            Fecha de Carga
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground" scope="col">
                            Cantidad de Registros
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground" scope="col">
                            Estado
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-foreground" scope="col">
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
                            <td className="py-3 px-4">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-success-muted text-success">
                                    {archivo.estado}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                                <Button
                                    onClick={() => onPreLiquidar(archivo.idFileImport)}
                                    disabled={isProcesando}
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    <Calculator className="h-4 w-4 mr-2" />
                                    Pre-liquidar
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
