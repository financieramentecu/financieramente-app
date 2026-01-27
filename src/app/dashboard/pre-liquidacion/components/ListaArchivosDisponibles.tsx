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
                    <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Nombre del Archivo
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Usuario que Cargó
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Fecha de Carga
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Cantidad de Registros
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Estado
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {archivos.map((archivo) => (
                        <tr
                            key={archivo.idFileImport}
                            className="border-b border-gray-100 hover:bg-gray-50"
                        >
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                {archivo.nombreArchivo}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                                {archivo.usuarioCargo}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                                {archivo.fechaCarga}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                                {archivo.cantidadRegistros} registros
                            </td>
                            <td className="py-3 px-4">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                                    {archivo.estado}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                                <Button
                                    onClick={() => onPreLiquidar(archivo.idFileImport)}
                                    disabled={isProcesando}
                                    size="sm"
                                    className="bg-[#00505C] hover:bg-[#003d47]"
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
