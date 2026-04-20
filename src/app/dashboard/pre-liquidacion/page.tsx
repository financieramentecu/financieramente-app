'use client'

import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import {
	FileText,
	Calculator,
	Filter,
} from 'lucide-react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { usePreLiquidacion } from '@/features/pre-liquidacion/hooks/use-pre-liquidacion'
import { ListaArchivosDisponibles } from './components/ListaArchivosDisponibles'
import { ProcesandoPreLiquidacion } from './components/ProcesandoPreLiquidacion'
import { ResultadosPreLiquidacion } from './components/ResultadosPreLiquidacion'
import { ModalErroresConfiguracion } from '@/features/pre-liquidacion/components/ModalErroresConfiguracion'
import { ModalConfirmacionPreliquidar } from '@/features/pre-liquidacion/components/ModalConfirmacionPreliquidar'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { TableRowsLoadingSkeleton } from '@/features/shared/ui/loading-skeletons'
import type { ArchivoDisponible } from '@/features/pre-liquidacion/types/types'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { Label } from '@/features/shared/ui/label'

/**
 * Página principal del módulo de Pre-liquidación
 */
export default function PreLiquidacionPage() {
	const {
		archivos,
		isLoading,
		error,
		errorProcesamiento,
		mensajeExito,
		refetch,
		registrosConError,
		modalErroresOpen,
		cerrarModalErrores,
		procesarPreLiquidacion,
		notificarArchivo,
		isProcesando,
	} = usePreLiquidacion()

	const [archivoParaPreliquidar, setArchivoParaPreliquidar] = useState<ArchivoDisponible | null>(null)
	const [modalConfirmacionOpen, setModalConfirmacionOpen] = useState(false)

	const [archivoSeleccionado, setArchivoSeleccionado] = useState<number | null>(
		null
	)

	// Estados para filtros (por defecto: mes y año actual)
	const now = new Date()
	const defaultMonth = (now.getMonth() + 1).toString().padStart(2, '0')
	const defaultYear = now.getFullYear().toString()
	const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth)
	const [selectedYear, setSelectedYear] = useState<string>(defaultYear)

	// Estados para flujo de procesamiento y resultados
	const [viewState, setViewState] = useState<'LIST' | 'PROCESSING' | 'RESULTS'>(
		'LIST'
	)

	const handleProcessComplete = () => {
		// Ya procesado en confirmar
		setViewState('RESULTS')
	}

	const handleBackToList = () => {
		setViewState('LIST')
		setArchivoSeleccionado(null)
		if (refetch) refetch()
	}

	const handlePreliquidarClick = (archivo: ArchivoDisponible) => {
		setArchivoParaPreliquidar(archivo)
		setModalConfirmacionOpen(true)
	}

	const handleConfirmarPreliquidar = async () => {
		if (!archivoParaPreliquidar) return

		// Extraer periodo del nombre del archivo (ej: SINCRONIZACION-VOLUNTARIA-ABRIL-2026.xlsx)
		const nombre = archivoParaPreliquidar.nombreArchivo
		const nombreSinExtension = nombre.split('.')[0]
		const parts = nombreSinExtension.split('-')
		
		const year = (parts[parts.length - 1] || '').replace(/\D/g, '')
		const monthName = (parts[parts.length - 2] || '').toUpperCase()
		
		const monthMap: Record<string, string> = {
			'ENERO': '01', 'FEBRERO': '02', 'MARZO': '03', 'ABRIL': '04',
			'MAYO': '05', 'JUNIO': '06', 'JULIO': '07', 'AGOSTO': '08',
			'SEPTIEMBRE': '09', 'OCTUBRE': '10', 'NOVIEMBRE': '11', 'DICIEMBRE': '12'
		}
		
		const mes = `${year}-${monthMap[monthName] || '04'}` // Default to April (04) for test data

		setArchivoSeleccionado(archivoParaPreliquidar.idFileImport)
		setModalConfirmacionOpen(false)
		
		// Iniciar procesamiento
		setViewState('PROCESSING')
		await procesarPreLiquidacion(archivoParaPreliquidar.idFileImport, mes)
	}


	// Generar opciones de años (actual y 4 anteriores)
	const currentYear = new Date().getFullYear()
	const years = Array.from({ length: 5 }, (_, i) =>
		(currentYear - i).toString()
	)

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

	// Filtrar archivos por mes/año (genérico, acepta filtros explícitos)
	const filterArchivosByDate = (
		archivosToFilter: typeof archivos,
		filterMonth: string,
		filterYear: string
	) => {
		if (!filterMonth && !filterYear) return archivosToFilter

		return archivosToFilter.filter((archivo) => {
			// Asumiendo fechaCarga formato ISO o compatible
			const fileDate = new Date(archivo.fechaCarga)
			// Ajustar mes 0-indexed a 01-12
			const fileMonth = (fileDate.getUTCMonth() + 1).toString().padStart(2, '0')
			const fileYear = fileDate.getUTCFullYear().toString()

			if (filterMonth && filterYear) {
				return fileMonth === filterMonth && fileYear === filterYear
			}
			if (filterMonth) return fileMonth === filterMonth
			if (filterYear) return fileYear === filterYear
			return true
		})
	}

	// Archivos en flujo: LOAD, PRE-SETTLED, PRE-SETTLE-APROVED, SETTLED, COMPLETED
	const archivosPendientes = archivos.filter(
		(a) => ['LOAD', 'PRE-SETTLED', 'PRE-SETTLE-APROVED', 'SETTLED', 'COMPLETED'].includes(a.estado)
	)
	const archivosPendientesFiltrados = filterArchivosByDate(
		archivosPendientes,
		selectedMonth,
		selectedYear
	)

	// Resumen calculado basado en archivos filtrados
	const resumenFiltrado = useMemo(() => {
		const totalArchivos = archivosPendientesFiltrados.length
		const totalRegistros = archivosPendientesFiltrados.reduce(
			(sum, a) => sum + (a.registrosPreliquidados || a.sincronizados || 0),
			0
		)
		const preLiquidados = archivosPendientesFiltrados.filter(
			(a) => a.estado === 'PRE-SETTLED'
		).length
		const liquidados = archivosPendientesFiltrados.filter(
			(a) => a.estado === 'SETTLED'
		).length
		const completados = archivosPendientesFiltrados.filter(
			(a) => a.estado === 'COMPLETED'
		).length
		const totalRezagados = archivosPendientesFiltrados.reduce(
			(sum, a) => sum + (a.rezagados || 0),
			0
		)

		return {
			totalArchivos,
			totalRegistros,
			preLiquidados,
			liquidados,
			completados,
			rezagados: totalRezagados,
		}
	}, [archivosPendientesFiltrados])

	// Componente de filtros
	const FiltrosComponent = () => (
		<div className="flex flex-wrap items-center gap-3">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Filter className="h-4 w-4" />
				<span>Filtrar por:</span>
			</div>

			<div className="w-32 space-y-1.5">
				<Label htmlFor="filtro-mes" className="text-xs text-muted-foreground">
					Mes
				</Label>
				<Select value={selectedMonth} onValueChange={setSelectedMonth}>
					<SelectTrigger id="filtro-mes">
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

			<div className="w-24 space-y-1.5">
				<Label htmlFor="filtro-anio" className="text-xs text-muted-foreground">
					Año
				</Label>
				<Select value={selectedYear} onValueChange={setSelectedYear}>
					<SelectTrigger id="filtro-anio">
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
		</div>
	)

	// Feedback unificado por toast (en lugar de bloques inline)
	useEffect(() => {
		if (error) toast.error(error)
	}, [error])
	useEffect(() => {
		if (errorProcesamiento) toast.error(errorProcesamiento)
	}, [errorProcesamiento])
	useEffect(() => {
		if (mensajeExito) toast.success(mensajeExito)
	}, [mensajeExito])

	return (
		<DashboardLayout currentPage="Pre-liquidación">
			<div className="container mx-auto py-8 px-4 max-w-7xl">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-3 mb-2">
						<Calculator className="h-8 w-8 text-primary" />
						<h1 className="text-3xl font-bold text-primary">
							Pre-liquidación de Comisiones
						</h1>
					</div>
					<p className="text-muted-foreground">
						Procesa archivos sincronizados y gestiona las pre-liquidaciones generadas
					</p>
				</div>

				{/* Contenido condicional */}
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

						{/* Panel de Resumen */}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="bg-card rounded-lg border border-border p-4 shadow-sm">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-muted-foreground">
											Total Archivos
										</p>
										<p className="text-2xl font-bold text-chart-1">
											{resumenFiltrado.totalArchivos}
										</p>
									</div>
									<FileText className="h-8 w-8 text-chart-1 opacity-50" />
								</div>
							</div>
							<div className="bg-card rounded-lg border border-border p-4 shadow-sm">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-muted-foreground">
											Pre-liquidados
										</p>
										<p className="text-2xl font-bold text-amber-600">
											{resumenFiltrado.preLiquidados}
										</p>
									</div>
									<Calculator className="h-8 w-8 text-amber-600 opacity-50" />
								</div>
							</div>
							<div className="bg-card rounded-lg border border-border p-4 shadow-sm">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-muted-foreground">
											Liquidados
										</p>
										<p className="text-2xl font-bold text-green-600">
											{resumenFiltrado.liquidados}
										</p>
									</div>
									<FileText className="h-8 w-8 text-green-600 opacity-50" />
								</div>
							</div>
							<div className="bg-card rounded-lg border border-border p-4 shadow-sm">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-muted-foreground">
											Completados
										</p>
										<p className="text-2xl font-bold text-blue-600">
											{resumenFiltrado.completados}
										</p>
									</div>
									<FileText className="h-8 w-8 text-blue-600 opacity-50" />
								</div>
							</div>
						</div>

						{/* Lista de archivos */}
						<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
							<div className="flex items-center gap-2 mb-4">
								<FileText className="h-5 w-5 text-primary" />
								<h2 className="text-lg font-semibold text-primary">
									Historial de Archivos y Pre-liquidaciones
								</h2>
							</div>


							{isLoading ? (
								<TableRowsLoadingSkeleton rows={6} />
							) : archivosPendientesFiltrados.length === 0 ? (
								<EmptyState
									icon={<FileText className="h-12 w-12" />}
									title={
										archivosPendientes.length === 0
											? 'No hay archivos pendientes de pre-liquidar'
											: 'No hay archivos que coincidan con los filtros seleccionados'
									}
								/>
							) : (
								<ListaArchivosDisponibles
									archivos={archivosPendientesFiltrados}
									onPreliquidar={handlePreliquidarClick}
									onNotificar={notificarArchivo}
								/>
							)}
						</div>
					</div>
				)}
			</div>
			<ModalErroresConfiguracion
				registrosConError={registrosConError}
				open={modalErroresOpen}
				onClose={cerrarModalErrores}
			/>
			<ModalConfirmacionPreliquidar
				open={modalConfirmacionOpen}
				onOpenChange={setModalConfirmacionOpen}
				onConfirmar={handleConfirmarPreliquidar}
				isConfirmando={isProcesando}
				fileName={archivoParaPreliquidar?.nombreArchivo}
			/>
		</DashboardLayout>
	)
}
