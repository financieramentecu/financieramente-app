'use client'

import { useResultadosPreLiquidacion } from '@/features/pre-liquidacion/hooks/use-resultados-pre-liquidacion'
import {
    // ... imports
    Download,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import type { ResultadoPreLiquidacion } from '@/features/pre-liquidacion/types/types'

// ID del archivo debe venir como prop o contexto. 
// Asumiremos que viene como prop o se obtiene de la URL/Contexto superior si no se pasa explícitamente.
// Pero la firma actual es { onBack: () => void }.
// Modificaremos para aceptar `fileId`.

export function ResultadosPreLiquidacion({
    fileId, // Nuevo prop requerido
    onBack,
}: {
    fileId?: number
    onBack: () => void
}) {
    // Si no hay fileId, no podemos cargar (debería manejarse en el padre)
    // Usamos el hook
    const {
        resultados,
        paginacion,
        categoriasUnicas,
        isLoading,
        page,
        siguientePagina,
        paginaAnterior,
        filtros,
        setFiltros,
        limpiarFiltros,
    } = useResultadosPreLiquidacion(fileId || 0)

    // Helper para formato moneda
    const formatCurrency = (value: number | undefined | null) => {
        if (value === undefined || value === null) return '-'
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(value)
    }

    // Helper para obtener valor de distribución
    const getValorDistribucion = (
        registro: ResultadoPreLiquidacion,
        categoria: string,
        tipo: 'bruta' | 'neta'
    ) => {
        const dist = registro.distribuciones.find(d => d.categoria === categoria)
        return dist ? (tipo === 'bruta' ? dist.bruta : dist.neta) : 0
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header con botón regresar */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="h-10 w-10 rounded-full hover:bg-muted"
                >
                    <ArrowLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-primary">Resultados Detallados</h2>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-1/4">
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Rango desde (Comisión):
                        </label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={filtros.minComision || ''}
                            onChange={(e) => setFiltros(prev => ({ ...prev, minComision: Number(e.target.value) || undefined }))}
                        />
                    </div>
                    <div className="w-full md:w-1/4">
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Rango hasta (Comisión):
                        </label>
                        <Input
                            type="number"
                            placeholder="Ej: 1000000"
                            value={filtros.maxComision || ''}
                            onChange={(e) => setFiltros(prev => ({ ...prev, maxComision: Number(e.target.value) || undefined }))}
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                        {/* Los filtros en el hook se aplican inmediatamente, pero mantenemos botones UX */}
                        <Button
                            variant="outline"
                            onClick={limpiarFiltros}
                            className=""
                        >
                            Limpiar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-primary">Registros Pre-liquidados</h3>
                        <p className="text-muted-foreground">
                            Total registros: {paginacion?.totalRegistros || 0}
                        </p>
                    </div>
                    {/* Exportar pendiente de implementación dinámica, por ahora visual */}
                    <Button>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Excel
                    </Button>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
                        <p className="text-muted-foreground mt-4">Cargando resultados...</p>
                    </div>
                ) : resultados.length === 0 ? (
<div className="text-center py-12 text-muted-foreground">
                                        No se encontraron registros que coincidan con los filtros.
                                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-muted border-b border-border">
                                    <tr>
                                        {/* Columnas fijas */}
                                        <th className="py-3 px-4 text-left font-semibold text-primary whitespace-nowrap" scope="col">Registro</th>
                                        <th className="py-3 px-4 text-left font-semibold text-primary whitespace-nowrap" scope="col">Producto</th>
                                        <th className="py-3 px-4 text-left font-semibold text-primary whitespace-nowrap" scope="col">Cliente</th>
                                        <th className="py-3 px-4 text-left font-semibold text-primary whitespace-nowrap" scope="col">Money Strategist</th>
                                        <th className="py-3 px-4 text-right font-semibold text-primary whitespace-nowrap bg-info-muted" scope="col">Comisión Base</th>

                                        {/* Columnas dinámicas generadas desde categoriasUnicas */}
                                        {categoriasUnicas.map(categoria => (
                                            <th key={categoria} className="py-3 px-4 text-center font-semibold text-primary border-l border-border whitespace-nowrap min-w-[150px]" scope="col">
                                                {categoria}
                                                <div className="grid grid-cols-2 gap-2 text-xs font-normal text-muted-foreground mt-1 border-t border-border pt-1">
                                                    <span>Bruta</span>
                                                    <span>Neta</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
<tbody className="divide-y divide-border">
                                            {resultados.map((row) => (
                                        <tr key={row.idSettlementCommission} className="hover:bg-muted/50">
                                            <td className="py-3 px-4 text-muted-foreground font-mono text-xs">#{row.idSettlementCommission}</td>
                                            <td className="py-3 px-4 font-medium text-foreground">{row.producto}</td>
                                            <td className="py-3 px-4 text-muted-foreground">{row.nombreCliente}</td>
                                            <td className="py-3 px-4 text-muted-foreground">
                                                <div className="flex flex-col">
                                                    <span>{row.nombreAgente}</span>
                                                    <span className="text-xs text-muted-foreground/80">{row.cedulaAgente}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold text-foreground bg-info-muted">
                                                {formatCurrency(row.comision)}
                                            </td>

                                            {/* Celdas dinámicas */}
                                            {categoriasUnicas.map(categoria => (
                                                <td key={categoria} className="py-3 px-4 border-l border-border">
                                                    <div className="grid grid-cols-2 gap-2 text-right">
                                                        <span className="text-muted-foreground">
                                                            {formatCurrency(getValorDistribucion(row, categoria, 'bruta'))}
                                                        </span>
                                                        <span className="font-medium text-primary">
                                                            {formatCurrency(getValorDistribucion(row, categoria, 'neta'))}
                                                        </span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        <div className="flex items-center justify-between border-t pt-4">
                            <p className="text-sm text-muted-foreground">
                                Mostrando pag. {page} de {paginacion?.totalPaginas || 1} ({paginacion?.totalRegistros || 0} registros)
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={paginaAnterior}
                                    disabled={page === 1}
                                    className="h-8 w-8"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={siguientePagina}
                                    disabled={!paginacion || page === paginacion.totalPaginas}
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
