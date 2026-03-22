'use client'

import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import {
	FileText,
	Calculator,
	AlertCircle,
	Filter,
	X,
	History,
	Clock,
} from 'lucide-react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { usePreLiquidacion } from '@/features/pre-liquidacion/hooks/use-pre-liquidacion'
import { ListaArchivosDisponibles } from './components/ListaArchivosDisponibles'
import { ProcesandoPreLiquidacion } from './components/ProcesandoPreLiquidacion'
import { ResultadosPreLiquidacion } from './components/ResultadosPreLiquidacion'
import { Button } from '@/features/shared/ui/button'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/features/shared/ui/tabs'
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
		procesarPreLiquidacion: _procesarPreLiquidacion,
		isProcesando: _isProcesando,
		errorProcesamiento,
		mensajeExito,
		refetch,
	} = usePreLiquidacion()

	const [archivoSeleccionado, setArchivoSeleccionado] = useState<number | null>(
		null
	)

	// Estados para filtros (por defecto: mes y año actual para preliquidar)
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

	// Archivos con registros PRE-SETTLED (ya preliquidados)
	const archivosPendientes = archivos.filter(
		(a) => a.estado === 'LOAD' && (a.registrosPreliquidados ?? 0) > 0
	)
	const archivosPendientesFiltrados = filterArchivosByDate(archivosPendientes)

	// Archivos ya pre-liquidados (LOAD y con registros PRE-SETTLED)
	const archivosHistorico = archivos.filter(
		(a) => a.estado === 'LOAD' && (a.registrosPreliquidados ?? 0) > 0
	)
	const archivosHistoricoFiltrados = filterArchivosByDate(archivosHistorico)

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

	// Componente de filtros reutilizable
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

				{/* Tabs principales */}
				<Tabs defaultValue="preliquidar" className="w-full">
					<TabsList className="grid w-full grid-cols-2 mb-6">
						<TabsTrigger
							value="preliquidar"
							className="flex items-center gap-2"
						>
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
					</TabsContent>

					{/* Tab Histórico */}
					<TabsContent value="historico">
						<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
							<div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
								<div className="flex items-center gap-2">
									<History className="h-5 w-5 text-primary" />
									<h2 className="text-lg font-semibold text-primary">
										Histórico de Pre-liquidaciones
									</h2>
								</div>
								<FiltrosComponent />
							</div>

							{isLoading ? (
								<TableRowsLoadingSkeleton rows={6} />
							) : archivosHistoricoFiltrados.length === 0 ? (
								<EmptyState
									icon={<History className="h-12 w-12" />}
									title={
										archivosHistorico.length === 0
											? 'No hay archivos pre-liquidados aún'
											: 'No hay archivos que coincidan con los filtros seleccionados'
									}
								/>
							) : (
								<>
									{/* Vista cards en móvil */}
									<div className="md:hidden space-y-3">
										{archivosHistoricoFiltrados.map((archivo) => (
											<div
												key={archivo.idFileImport}
												className="rounded-lg border border-border bg-card p-4 shadow-sm"
											>
												<div className="font-medium text-foreground">
													{archivo.nombreArchivo}
												</div>
												<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
													<span>Carga: {archivo.fechaCarga}</span>
													<span>
														Pre-liq.: {archivo.fechaPreLiquidacion || '-'}
													</span>
												</div>
												<div className="mt-2 flex flex-wrap gap-2 text-sm">
													<span>Registros: {archivo.totalRegistros}</span>
													<span className="text-chart-3">
														Sync: {archivo.sincronizados}
													</span>
													<span className="text-chart-4">
														Rezag: {archivo.rezagados}
													</span>
													<span className="px-2 py-0.5 rounded text-xs font-medium bg-success-muted text-success">
														Pre-liquidado
													</span>
												</div>
											</div>
										))}
									</div>
									{/* Tabla en desktop */}
									<div className="hidden md:block overflow-x-auto rounded-md border border-border">
										<table className="w-full text-sm">
											<thead className="bg-muted">
												<tr>
													<th
														className="text-left py-3 px-4 font-semibold text-foreground"
														scope="col"
													>
														Archivo
													</th>
													<th
														className="text-left py-3 px-4 font-semibold text-foreground"
														scope="col"
													>
														Fecha Carga
													</th>
													<th
														className="text-left py-3 px-4 font-semibold text-foreground"
														scope="col"
													>
														Fecha Pre-liquidación
													</th>
													<th
														className="text-center py-3 px-4 font-semibold text-foreground"
														scope="col"
													>
														Registros
													</th>
													<th
														className="text-center py-3 px-4 font-semibold text-foreground"
														scope="col"
													>
														SYNCHRONIZED
													</th>
													<th
														className="text-center py-3 px-4 font-semibold text-foreground"
														scope="col"
													>
														Rezagados
													</th>
													<th
														className="text-center py-3 px-4 font-semibold text-foreground"
														scope="col"
													>
														Estado
													</th>
												</tr>
											</thead>
											<tbody>
												{archivosHistoricoFiltrados.map((archivo) => (
													<tr
														key={archivo.idFileImport}
														className="border-t border-border hover:bg-muted/50"
													>
														<td className="py-3 px-4 font-medium">
															{archivo.nombreArchivo}
														</td>
														<td className="py-3 px-4">{archivo.fechaCarga}</td>
														<td className="py-3 px-4">
															{archivo.fechaPreLiquidacion || '-'}
														</td>
														<td className="py-3 px-4 text-center">
															{archivo.totalRegistros}
														</td>
														<td className="py-3 px-4 text-center text-chart-3">
															{archivo.sincronizados}
														</td>
														<td className="py-3 px-4 text-center text-chart-4">
															{archivo.rezagados}
														</td>
														<td className="py-3 px-4 text-center">
															<span className="px-2 py-1 rounded text-xs font-medium bg-success-muted text-success">
																PRE-LIQUIDADO
															</span>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</>
							)}
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</DashboardLayout>
	)
}
