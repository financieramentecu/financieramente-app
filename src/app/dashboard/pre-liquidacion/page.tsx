'use client'

import { useState, useMemo } from 'react'
import { FileText, Calculator, AlertCircle, Filter, X, History, Clock } from 'lucide-react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { usePreLiquidacion } from '@/features/pre-liquidacion/hooks/use-pre-liquidacion'
import { ListaArchivosDisponibles } from './components/ListaArchivosDisponibles'
import { ModalConfirmacionPreLiquidacion } from './components/ModalConfirmacionPreLiquidacion'
import { ProcesandoPreLiquidacion } from './components/ProcesandoPreLiquidacion'
import { ResultadosPreLiquidacion } from './components/ResultadosPreLiquidacion'
import { Button } from '@/features/shared/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/features/shared/ui/select'

/**
 * Página principal del módulo de Pre-liquidación
 */
export default function PreLiquidacionPage() {
    const {
        archivos,
        isLoading,
        error,
        procesarPreLiquidacion,
        isProcesando,
        errorProcesamiento,
        mensajeExito,
        refetch,
    } = usePreLiquidacion()

    const [archivoSeleccionado, setArchivoSeleccionado] = useState<number | null>(null)
    const [modalOpen, setModalOpen] = useState(false)

    // Estados para filtros
    const [selectedMonth, setSelectedMonth] = useState<string>('')
    const [selectedYear, setSelectedYear] = useState<string>('')

    // Estados para flujo de procesamiento y resultados
    const [viewState, setViewState] = useState<'LIST' | 'PROCESSING' | 'RESULTS'>('LIST')

    const handlePreLiquidarClick = (fileId: number) => {
        setArchivoSeleccionado(fileId)
        setModalOpen(true)
    }

    const handleConfirmarPreLiquidacion = async (mes: string) => {
        if (archivoSeleccionado) {
            await procesarPreLiquidacion(archivoSeleccionado, mes)
            setModalOpen(false)
            setViewState('RESULTS') // Opcional: ir a resultados inmediatamente si fue éxito
        }
    }

    const handleProcessComplete = () => {
        // Ya procesado en confirmar
        setViewState('RESULTS')
    }

    const handleBackToList = () => {
        setViewState('LIST')
        setArchivoSeleccionado(null)
        if (refetch) refetch()
    }

    // Generar opciones de años (actual y 4 anteriores)
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())

    // Opciones de meses (formato 01-12 para consistencia con YYYY-MM)
    const months = [
        { value: '01', label: 'Enero' },
        { value: '02', label: 'Febrero' },
        { value: '03', label: 'Marzo' },
        { value: '04', label: 'Abril' },
        { value: '05', label: 'Mayo' },
        { value: '06', label: 'Junio' },
        { value: '07', label: 'Julio' },
        { value: '08', label: 'Agosto' },
        { value: '09', label: 'Septiembre' },
        { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' },
        { value: '12', label: 'Diciembre' },
    ]

    const clearFilters = () => {
        setSelectedMonth('')
        setSelectedYear('')
    }

    // Filtrar archivos por mes/año
    const filterArchivosByDate = (archivosToFilter: typeof archivos) => {
        if (!selectedMonth && !selectedYear) return archivosToFilter

        return archivosToFilter.filter((archivo) => {
            // Asumiendo fechaCarga formato ISO o compatible
            const fileDate = new Date(archivo.fechaCarga)
            // Ajustar mes 0-indexed a 01-12
            const fileMonth = (fileDate.getUTCMonth() + 1).toString().padStart(2, '0')
            const fileYear = fileDate.getUTCFullYear().toString()

            if (selectedMonth && selectedYear) {
                return fileMonth === selectedMonth && fileYear === selectedYear
            }
            if (selectedMonth) return fileMonth === selectedMonth
            if (selectedYear) return fileYear === selectedYear
            return true
        })
    }

    // Archivos pendientes de pre-liquidar (COMPLETADO)
    const archivosPendientes = archivos.filter((a) => a.estado === 'COMPLETADO')
    const archivosPendientesFiltrados = filterArchivosByDate(archivosPendientes)

    // Archivos ya pre-liquidados (PRELIQUIDADO) o con fecha de pre-liquidación
    const archivosHistorico = archivos.filter(
        (a) => a.estado === 'PRELIQUIDADO' || !!a.fechaPreLiquidacion
    )
    const archivosHistoricoFiltrados = filterArchivosByDate(archivosHistorico)

    // Resumen calculado basado en archivos filtrados
    const resumenFiltrado = useMemo(() => {
        const totalArchivos = archivosPendientesFiltrados.length
        const totalRegistros = archivosPendientesFiltrados.reduce((sum, a) => sum + a.totalRegistros, 0)
        const totalSincronizados = archivosPendientesFiltrados.reduce((sum, a) => sum + a.sincronizados, 0)
        const totalRezagados = archivosPendientesFiltrados.reduce((sum, a) => sum + a.rezagados, 0)

        return {
            totalArchivos,
            totalRegistros,
            sincronizados: totalSincronizados,
            rezagados: totalRezagados,
        }
    }, [archivosPendientesFiltrados])

    // Componente de filtros reutilizable
    const FiltrosComponent = () => (
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Filter className="h-4 w-4" />
                <span>Filtrar por:</span>
            </div>

            <div className="w-32">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                        <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                        {months.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                                {month.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="w-24">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                        <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map((year) => (
                            <SelectItem key={year} value={year}>
                                {year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {(selectedMonth || selectedYear) && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFilters}
                    className="h-9 w-9 text-gray-500 hover:text-red-500"
                    title="Limpiar filtros"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    )

    // Validación de pre-liquidación
    const puedePreLiquidar = selectedMonth !== '' && selectedYear !== ''

    // Si no ha seleccionado mes/año, mostramos aviso o deshabilitamos el click
    // Opción UI: Modificar ListaArchivos para recibir 'puedePreLiquidar' y deshabilitar?
    // O validar en el click handlePreLiquidarClick
    const handlePreLiquidarClickConValidacion = (fileId: number) => {
        if (!puedePreLiquidar) {
            alert('Por favor selecciona un Mes y Año en los filtros para proceder con la Pre-liquidación.')
            return
        }
        handlePreLiquidarClick(fileId)
    }

    return (
        <DashboardLayout currentPage="Pre-liquidación">
            <div className="container mx-auto py-8 px-4 max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Calculator className="h-8 w-8 text-[#00505C]" />
                        <h1 className="text-3xl font-bold text-[#00505C]">
                            Pre-liquidación de Comisiones
                        </h1>
                    </div>
                    <p className="text-gray-600">
                        Procesa archivos sincronizados y genera cálculos de distribución comisional automáticos
                    </p>
                </div>

                {/* Error global */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Error de procesamiento */}
                {errorProcesamiento && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        <p>{errorProcesamiento}</p>
                    </div>
                )}

                {/* Mensaje de éxito */}
                {mensajeExito && (
                    <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-md flex items-center gap-2">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p>{mensajeExito}</p>
                    </div>
                )}

                {/* Tabs principales */}
                <Tabs defaultValue="preliquidar" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="preliquidar" className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Pre-liquidar ({archivosPendientes.length})
                        </TabsTrigger>
                        <TabsTrigger value="historico" className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Histórico ({archivosHistorico.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab Pre-liquidar */}
                    <TabsContent value="preliquidar">
                        {/* Contenido condicional dentro del Tab */}
                        {viewState === 'PROCESSING' ? (
                            <ProcesandoPreLiquidacion onComplete={handleProcessComplete} />
                        ) : viewState === 'RESULTS' ? (
                            <ResultadosPreLiquidacion
                                fileId={archivoSeleccionado || 0}
                                onBack={handleBackToList}
                            />
                        ) : (
                            /* Vista normal de Lista y Resumen */
                            <div className="space-y-6">
                                {/* Filtros */}
                                <div className="flex justify-end">
                                    <FiltrosComponent />
                                </div>

                                {/* Panel de Resumen (dentro del tab, basado en filtros) */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-500">Total Archivos</p>
                                                <p className="text-2xl font-bold text-[#00505C]">{resumenFiltrado.totalArchivos}</p>
                                            </div>
                                            <FileText className="h-8 w-8 text-[#00505C] opacity-50" />
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-500">Total Registros</p>
                                                <p className="text-2xl font-bold text-blue-600">{resumenFiltrado.totalRegistros}</p>
                                            </div>
                                            <FileText className="h-8 w-8 text-blue-600 opacity-50" />
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-500">Sincronizados</p>
                                                <p className="text-2xl font-bold text-green-600">{resumenFiltrado.sincronizados}</p>
                                            </div>
                                            <Clock className="h-8 w-8 text-green-600 opacity-50" />
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-500">Rezagados</p>
                                                <p className="text-2xl font-bold text-amber-600">{resumenFiltrado.rezagados}</p>
                                            </div>
                                            <AlertCircle className="h-8 w-8 text-amber-600 opacity-50" />
                                        </div>
                                    </div>
                                </div>

                                {/* Lista de archivos */}
                                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <FileText className="h-5 w-5 text-[#00505C]" />
                                        <h2 className="text-lg font-semibold text-[#00505C]">
                                            Archivos Pendientes de Pre-liquidar
                                        </h2>
                                    </div>

                                    {!puedePreLiquidar && (
                                        <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-md border border-blue-100 flex items-center gap-2">
                                            <Filter className="h-4 w-4" />
                                            <span>Para pre-liquidar, primero selecciona un <b>Mes</b> y <b>Año</b> en los filtros superiores.</span>
                                        </div>
                                    )}

                                    {isLoading ? (
                                        <div className="text-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00505C] mx-auto"></div>
                                            <p className="text-muted-foreground mt-4">Cargando archivos...</p>
                                        </div>
                                    ) : archivosPendientesFiltrados.length === 0 ? (
                                        <div className="text-center py-12">
                                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                            <p className="text-muted-foreground">
                                                {archivosPendientes.length === 0
                                                    ? 'No hay archivos pendientes de pre-liquidar'
                                                    : 'No hay archivos que coincidan con los filtros seleccionados'}
                                            </p>
                                        </div>
                                    ) : (
                                        <ListaArchivosDisponibles
                                            archivos={archivosPendientesFiltrados}
                                            onPreLiquidar={handlePreLiquidarClickConValidacion}
                                            isProcesando={isProcesando}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* Tab Histórico */}
                    <TabsContent value="historico">
                        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                                <div className="flex items-center gap-2">
                                    <History className="h-5 w-5 text-[#00505C]" />
                                    <h2 className="text-lg font-semibold text-[#00505C]">
                                        Histórico de Pre-liquidaciones
                                    </h2>
                                </div>
                                <FiltrosComponent />
                            </div>

                            {isLoading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00505C] mx-auto"></div>
                                    <p className="text-muted-foreground mt-4">Cargando histórico...</p>
                                </div>
                            ) : archivosHistoricoFiltrados.length === 0 ? (
                                <div className="text-center py-12">
                                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">
                                        {archivosHistorico.length === 0
                                            ? 'No hay archivos pre-liquidados aún'
                                            : 'No hay archivos que coincidan con los filtros seleccionados'}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Archivo</th>
                                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha Carga</th>
                                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha Pre-liquidación</th>
                                                <th className="text-center py-3 px-4 font-semibold text-gray-700">Registros</th>
                                                <th className="text-center py-3 px-4 font-semibold text-gray-700">Sincronizados</th>
                                                <th className="text-center py-3 px-4 font-semibold text-gray-700">Rezagados</th>
                                                <th className="text-center py-3 px-4 font-semibold text-gray-700">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {archivosHistoricoFiltrados.map((archivo) => (
                                                <tr key={archivo.idFileImport} className="border-t hover:bg-gray-50">
                                                    <td className="py-3 px-4 font-medium">{archivo.nombreArchivo}</td>
                                                    <td className="py-3 px-4">{archivo.fechaCarga}</td>
                                                    <td className="py-3 px-4">{archivo.fechaPreLiquidacion || '-'}</td>
                                                    <td className="py-3 px-4 text-center">{archivo.totalRegistros}</td>
                                                    <td className="py-3 px-4 text-center text-green-600">{archivo.sincronizados}</td>
                                                    <td className="py-3 px-4 text-center text-amber-600">{archivo.rezagados}</td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                                            Pre-liquidado
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Modal de Confirmación */}
                <ModalConfirmacionPreLiquidacion
                    open={modalOpen}
                    onOpenChange={setModalOpen}
                    archivo={archivos.find((a) => a.idFileImport === archivoSeleccionado)}
                    onConfirmar={() => handleConfirmarPreLiquidacion(`${selectedYear}-${selectedMonth}`)}
                    isProcesando={isProcesando}
                    mesSeleccionado={selectedMonth && selectedYear ? `${selectedMonth}/${selectedYear}` : undefined}
                />
            </div>
        </DashboardLayout>
    )
}
