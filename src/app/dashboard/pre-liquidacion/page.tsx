'use client'

import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import {
	FileText,
	Calculator,
	AlertCircle,
	Filter,
} from 'lucide-react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { usePreLiquidacion } from '@/features/pre-liquidacion/hooks/use-pre-liquidacion'
import { ListaArchivosDisponibles } from './components/ListaArchivosDisponibles'
import { ProcesandoPreLiquidacion } from './components/ProcesandoPreLiquidacion'
import { ResultadosPreLiquidacion } from './components/ResultadosPreLiquidacion'
import { ModalErroresConfiguracion } from '@/features/pre-liquidacion/components/ModalErroresConfiguracion'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { TableRowsLoadingSkeleton } from '@/features/shared/ui/loading-skeletons'
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
	} = usePreLiquidacion()

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

	// Archivos para pre-liquidar: Estado PRE-SETTLED (ya pre-liquidados, pendientes de revisión/aprobación)
	const archivosPendientes = archivos.filter(
		(a) => a.estado === 'PRE-SETTLED'
	)
	const archivosPendientesFiltrados = filterArchivosByDate(
		archivosPendientes,
		selectedMonth,
		selectedYear
	)

	// Resumen calculado basado en archivos filtrados
	const resumenFiltrado = useMemo(() => {
		const totalArchivos = archivosPendientesFiltrados.length
		const totalRegistrosPreliquidados = archivosPendientesFiltrados.reduce(
			(sum, a) => sum + (a.registrosPreliquidados ?? 0),
			0
		)
		const totalRezagados = archivosPendientesFiltrados.reduce(
			(sum, a) => sum + a.rezagados,
			0
		)

		return {
			totalArchivos,
			totalRegistros: totalRegistrosPreliquidados,
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
						Procesa archivos sincronizados y genera cálculos de distribución
						comisional automáticos
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
						<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
											Total Registros
										</p>
										<p className="text-2xl font-bold text-chart-2">
											{resumenFiltrado.totalRegistros}
										</p>
									</div>
									<FileText className="h-8 w-8 text-chart-2 opacity-50" />
								</div>
							</div>
							<div className="bg-card rounded-lg border border-border p-4 shadow-sm">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-muted-foreground">
											Rezagados
										</p>
										<p className="text-2xl font-bold text-chart-4">
											{resumenFiltrado.rezagados}
										</p>
									</div>
									<AlertCircle className="h-8 w-8 text-chart-4 opacity-50" />
								</div>
							</div>
						</div>

						{/* Lista de archivos */}
						<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
							<div className="flex items-center gap-2 mb-4">
								<FileText className="h-5 w-5 text-primary" />
								<h2 className="text-lg font-semibold text-primary">
									Archivos pendientes para validar la Pre-Liquidación
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
		</DashboardLayout>
	)
}
