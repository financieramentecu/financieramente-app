'use client'

import { useState, useMemo } from 'react'
import {
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'

// Mock Data para la visualización
const MOCK_REGISTERED_DATA = Array.from({ length: 45 }).map((_, i) => ({
    registro: `REG-${(i + 31).toString().padStart(3, '0')}`,
    producto: i % 3 === 0 ? 'Seguro Vida' : i % 3 === 1 ? 'Ahorro Volunt' : 'Todo Riesgo',
    rezagado: i % 10 === 0 ? 'SI' : 'NO',
    nombreCliente: ['LUIS AVILA', 'ANDREA PEREA', 'ANA DIAZ', 'EVA GOMEZ', 'LUISA RUIZ'][i % 5],
    cedulaAgente: ['1003243788', '10987356', '16078908', '35465890'][i % 4],
    nombreAgente: ['JUAN PEREZ', 'LUIS ARENAS', 'JOSE LOPEZ', 'CRISTIAN LEON'][i % 4],
    contrato: 'XXXXXXXX',
    tipoComision: 'X',
    valorOrig: (Math.random() * 2000000 + 300000).toFixed(0),
    comisionCalc: (Math.random() * 50000 + 5000).toFixed(0),
}))

export function ResultadosPreLiquidacion({
    onBack,
}: {
    onBack: () => void
}) {
    const [currentPage, setCurrentPage] = useState(1)
    const [minRange, setMinRange] = useState('')
    const [maxRange, setMaxRange] = useState('')
    const [activeFilter, setActiveFilter] = useState<{ min: number; max: number } | null>(null)

    const itemsPerPage = 10

    // Filtrar datos
    const filteredData = useMemo(() => {
        if (!activeFilter) return MOCK_REGISTERED_DATA

        return MOCK_REGISTERED_DATA.filter((item) => {
            const value = Number(item.comisionCalc)
            const min = activeFilter.min
            const max = activeFilter.max > 0 ? activeFilter.max : Infinity
            return value >= min && value <= max
        })
    }, [activeFilter])

    const totalPages = Math.ceil(filteredData.length / itemsPerPage)

    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handleSearch = () => {
        const min = minRange ? Number(minRange) : 0
        const max = maxRange ? Number(maxRange) : 0
        setActiveFilter({ min, max })
        setCurrentPage(1)
    }

    const handleShowAll = () => {
        setMinRange('')
        setMaxRange('')
        setActiveFilter(null)
        setCurrentPage(1)
    }

    const formatCurrency = (value: string) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(Number(value))
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header con botón regresar */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="h-10 w-10 rounded-full hover:bg-gray-100"
                >
                    <ArrowLeft className="h-6 w-6 text-gray-600" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-[#00505C]">Búsqueda por rango de Valores</h2>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-1/4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rango desde (Comisión):
                        </label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={minRange}
                            onChange={(e) => setMinRange(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-1/4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rango hasta (Comisión):
                        </label>
                        <Input
                            type="number"
                            placeholder="Ej: 1000000"
                            value={maxRange}
                            onChange={(e) => setMaxRange(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                        <Button
                            onClick={handleSearch}
                            className="bg-[#00505C] hover:bg-[#003d47] text-white px-6"
                        >
                            <Search className="h-4 w-4 mr-2" />
                            Buscar
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleShowAll}
                            className="border-gray-300"
                        >
                            Mostrar todos
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-[#00505C]">Resultados de Pre-liquidación</h3>
                        <p className="text-gray-500">
                            Pre-liquidación completada: {filteredData.length} registros encontrados {activeFilter ? '(filtrado)' : ''}
                        </p>
                    </div>
                    <Button className="bg-[#00505C] hover:bg-[#003d47] text-white">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Excel
                    </Button>
                </div>

                {filteredData.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No se encontraron registros que coincidan con el rango seleccionado.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="py-3 px-4 text-left font-semibold text-[#00505C]">Registro</th>
                                        <th className="py-3 px-4 text-left font-semibold text-[#00505C]">Producto</th>
                                        <th className="py-3 px-4 text-left font-semibold text-[#00505C]">Rezagado</th>
                                        <th className="py-3 px-4 text-left font-semibold text-[#00505C]">Nombre Cliente</th>
                                        <th className="py-3 px-4 text-left font-semibold text-[#00505C]">Cedula Agente</th>
                                        <th className="py-3 px-4 text-left font-semibold text-[#00505C]">Nombre Agente</th>
                                        <th className="py-3 px-4 text-left font-semibold text-[#00505C]">Nombre Contrato</th>
                                        <th className="py-3 px-4 text-left font-semibold text-[#00505C]">Tipo de Comisión</th>
                                        <th className="py-3 px-4 text-right font-semibold text-[#00505C]">Valor Orig Del Negocio</th>
                                        <th className="py-3 px-4 text-right font-semibold text-[#00505C]">Comisión Gral Calculada</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="py-3 px-4 text-gray-500">{row.registro}</td>
                                            <td className="py-3 px-4 font-medium text-gray-900">{row.producto}</td>
                                            <td className="py-3 px-4 text-gray-500">{row.rezagado}</td>
                                            <td className="py-3 px-4 text-gray-500">{row.nombreCliente}</td>
                                            <td className="py-3 px-4 text-gray-500">{row.cedulaAgente}</td>
                                            <td className="py-3 px-4 text-gray-500">{row.nombreAgente}</td>
                                            <td className="py-3 px-4 text-gray-500">{row.contrato}</td>
                                            <td className="py-3 px-4 text-gray-500">{row.tipoComision}</td>
                                            <td className="py-3 px-4 text-right text-gray-500">{formatCurrency(row.valorOrig)}</td>
                                            <td className="py-3 px-4 text-right font-medium text-[#00505C]">{formatCurrency(row.comisionCalc)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        <div className="flex items-center justify-between border-t pt-4">
                            <p className="text-sm text-gray-500">
                                Mostrando los registros del {(currentPage - 1) * itemsPerPage + 1} al {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} Total.
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 mr-2">Pag. {currentPage}</span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 w-8"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
