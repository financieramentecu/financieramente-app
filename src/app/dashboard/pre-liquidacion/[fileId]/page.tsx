'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calculator, FileText } from 'lucide-react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { Button } from '@/features/shared/ui/button'
import { useComisionesPreliquidadas } from '@/features/pre-liquidacion/hooks/use-comisiones-preliquidadas'
import { useLiquidarRegistros } from '@/features/pre-liquidacion/hooks/use-liquidar-registros'
import { useRezagarRegistros } from '@/features/pre-liquidacion/hooks/use-rezagar-registros'
import { RegistrosLiquidacionTable } from '@/features/pre-liquidacion/components/RegistrosLiquidacionTable'
import { BarraAccionesLiquidacion } from '@/features/pre-liquidacion/components/BarraAccionesLiquidacion'
import { ModalConfirmacionLiquidar } from '@/features/pre-liquidacion/components/ModalConfirmacionLiquidar'
import { ModalConfirmacionRezagar } from '@/features/pre-liquidacion/components/ModalConfirmacionRezagar'
import { ModalVerNegocio } from '@/features/pre-liquidacion/components/ModalVerNegocio'
import { ModalDetalleDistribucion } from '@/features/pre-liquidacion/components/ModalDetalleDistribucion'
import { ModalConfirmacionPreliquidar } from '@/features/pre-liquidacion/components/ModalConfirmacionPreliquidar'
import { ModalErroresConfiguracion } from '@/features/pre-liquidacion/components/ModalErroresConfiguracion'
import { usePreLiquidacion } from '@/features/pre-liquidacion/hooks/use-pre-liquidacion'
import { RegistrosLiquidacionSkeleton } from '@/features/shared/ui/loading-skeletons'
import { StatusBadge } from '@/features/pre-liquidacion/components/StatusBadge'
import { AlertCircle, CheckCircle2, AlertTriangle, Mail } from 'lucide-react'

export default function DetallePreLiquidacionPage() {
	const params = useParams()
	const router = useRouter()
	const fileId =
		typeof params.fileId === 'string' ? parseInt(params.fileId, 10) : null

	const {
		registros,
		archivo,
		isLoading,
		error,
		refetch,
	} = useComisionesPreliquidadas(fileId)

	const {
		procesarPreLiquidacion,
		isProcesando,
		errorProcesamiento,
		mensajeExito,
		registrosConError,
		modalErroresOpen,
		cerrarModalErrores,
		notificarArchivo,
	} = usePreLiquidacion()

	const { execute: executeLiquidar, state: liquidarState } =
		useLiquidarRegistros()
	const { execute: executeRezagar, state: rezagarState } = useRezagarRegistros()

	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
	const [modalLiquidarOpen, setModalLiquidarOpen] = useState(false)
	const [modalRezagarOpen, setModalRezagarOpen] = useState(false)
	const [modalPreliquidarOpen, setModalPreliquidarOpen] = useState(false)
	const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(
		null
	)
	const [modalVerNegocioOpen, setModalVerNegocioOpen] = useState(false)
	const [selectedCommissionId, setSelectedCommissionId] = useState<
		number | null
	>(null)
	const [modalDistribucionOpen, setModalDistribucionOpen] = useState(false)

	const isLiquidando = liquidarState.status === 'loading'
	const isRezagando = rezagarState.status === 'loading'

	function handleLiquidar() {
		setModalLiquidarOpen(true)
	}

	function handleRezagar() {
		setModalRezagarOpen(true)
	}

	async function handleConfirmarLiquidar() {
		if (!fileId || selectedIds.size === 0) return
		const ids = Array.from(selectedIds)
		const result = await executeLiquidar(ids, fileId)
		if (result) {
			setSelectedIds(new Set())
			setModalLiquidarOpen(false)
			await refetch()
		}
	}

	async function handleConfirmarRezagar() {
		if (!fileId || selectedIds.size === 0) return
		const ids = Array.from(selectedIds)
		const result = await executeRezagar(ids, fileId)
		if (result) {
			setSelectedIds(new Set())
			setModalRezagarOpen(false)
			await refetch()
		}
	}

	async function handleConfirmarPreliquidar() {
		if (!fileId || !archivo) return
		// Extraer periodo del nombre del archivo (ej: SINCRONIZACION-VOLUNTARIA-ABRIL-2026.xlsx)
		const nombre = archivo.nombreArchivo
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

		await procesarPreLiquidacion(fileId, mes)
		setModalPreliquidarOpen(false)

		await refetch()
		router.refresh()
	}

	function handleVerNegocio(idBusiness: number) {
		setSelectedBusinessId(idBusiness)
		setModalVerNegocioOpen(true)
	}

	function handleVerDistribucion(idSettlementCommission: number) {
		setSelectedCommissionId(idSettlementCommission)
		setModalDistribucionOpen(true)
	}

	if (fileId == null || fileId <= 0) {
		return (
			<DashboardLayout>
				<div className="p-4 text-destructive">ID de archivo inválido</div>
			</DashboardLayout>
		)
	}

	return (
		<DashboardLayout>
			<div className="space-y-6 p-6">
				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="sm"
							asChild
							className="cursor-pointer shrink-0"
						>
							<Link href="/dashboard/pre-liquidacion">
								<ArrowLeft className="h-4 w-4 mr-1.5" />
								Volver
							</Link>
						</Button>
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-primary/10 p-2 shrink-0">
								<Calculator className="h-5 w-5 text-primary" />
							</div>
							<div>
								<h1 className="text-xl font-bold text-foreground flex items-center gap-3">
									Detalle de Comisiones
									{archivo && (
										<StatusBadge status={archivo.estado || ''} />
									)}
								</h1>
								{archivo && (
									<p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
										<FileText className="h-3.5 w-3.5" />
										{archivo.nombreArchivo}
										{archivo.fileType && (
											<span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
												{archivo.fileType}
											</span>
										)}
									</p>
								)}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3 shrink-0">
						{(archivo?.estado === 'PRE-SETTLED' ||
							archivo?.estado === 'PRE-SETTLE-APROVED' ||
							archivo?.estado === 'SETTLED' ||
							archivo?.estado === 'COMPLETED') && (
							<Button
								onClick={async () => {
									if (!fileId) return
									const success = await notificarArchivo(fileId)
									if (success) {
										await refetch()
									}
								}}
								disabled={isProcesando}
								className="bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transition-all border-none cursor-pointer"
								size="sm"
								title={
									archivo?.estado === 'SETTLED' ||
									archivo?.estado === 'COMPLETED'
										? 'Reenviar el comprobante final a todos los beneficiarios'
										: 'Reenviar el correo de pre-liquidación con el link al recibo a todos los beneficiarios'
								}
							>
								<Mail className="h-4 w-4 mr-2" />
								{archivo?.estado === 'SETTLED' ||
								archivo?.estado === 'COMPLETED'
									? 'Notificar comprobante a coaches'
									: 'Notificar pre-liquidación a coaches'}
							</Button>
						)}
						{registros.length > 0 && (
							<span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
								{registros.length} registros
							</span>
						)}
					</div>
				</div>

				{mensajeExito && (
					<div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3 text-sm text-emerald-800">
						<CheckCircle2 className="h-5 w-5 text-emerald-500" />
						<p>{mensajeExito}</p>
					</div>
				)}

				{(error || errorProcesamiento) && (
					<div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 flex items-center gap-3 text-sm text-destructive">
						<AlertCircle className="h-5 w-5" />
						<p>{error || errorProcesamiento}</p>
					</div>
				)}

				{archivo?.estado === 'LOAD' && !mensajeExito && !errorProcesamiento && (
					<div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
								<AlertTriangle className="h-6 w-6" />
							</div>
							<div>
								<h3 className="text-lg font-semibold text-emerald-900">
									Archivo listo para pre-liquidar
								</h3>
								<p className="text-sm text-emerald-700/80">
									Este archivo tiene registros sincronizados pero aún no se han realizado los cálculos de comisiones.
								</p>
							</div>
						</div>
						<Button 
							size="lg"
							onClick={() => setModalPreliquidarOpen(true)}
							className="bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer border-none"
							disabled={isProcesando}
						>
							<Calculator className="mr-2 h-5 w-5" />
							Iniciar Pre-liquidación
						</Button>
					</div>
				)}

				{isLoading ? (
					<RegistrosLiquidacionSkeleton />
				) : registros.length === 0 ? (
					<div className="py-16 flex flex-col items-center gap-4 text-center">
						<p className="text-muted-foreground max-w-md">
							No hay comisiones sincronizadas ni pre-liquidadas para este archivo.
						</p>
						<Button asChild className="cursor-pointer">
							<Link href="/dashboard/liquidaciones">
								Ir a liquidaciones
							</Link>
						</Button>
					</div>
				) : (
					<>
						<RegistrosLiquidacionTable
							registros={registros}
							fileType={archivo?.fileType ?? ''}
							fileName={archivo?.nombreArchivo ?? ''}
							selectedIds={selectedIds}
							onSelectionChange={setSelectedIds}
							onVerNegocio={handleVerNegocio}
							onVerDistribucion={handleVerDistribucion}
							selectable={archivo?.estado !== 'LOAD'}
							estado={archivo?.estado}
						/>
						{archivo?.estado !== 'LOAD' && archivo?.estado !== 'SETTLED' && archivo?.estado !== 'COMPLETED' && (
							<BarraAccionesLiquidacion
								selectedCount={selectedIds.size}
								onLiquidar={handleLiquidar}
								onRezagar={handleRezagar}
								isLiquidando={isLiquidando}
								isRezagando={isRezagando}
							/>
						)}
					</>
				)}
			</div>

			<ModalConfirmacionLiquidar
				open={modalLiquidarOpen}
				onOpenChange={setModalLiquidarOpen}
				count={selectedIds.size}
				onConfirmar={handleConfirmarLiquidar}
				isConfirmando={isLiquidando}
			/>
			<ModalConfirmacionRezagar
				open={modalRezagarOpen}
				onOpenChange={setModalRezagarOpen}
				count={selectedIds.size}
				onConfirmar={handleConfirmarRezagar}
				isConfirmando={isRezagando}
			/>
			<ModalConfirmacionPreliquidar
				open={modalPreliquidarOpen}
				onOpenChange={setModalPreliquidarOpen}
				onConfirmar={handleConfirmarPreliquidar}
				isConfirmando={isProcesando}
				fileName={archivo?.nombreArchivo}
			/>
			<ModalErroresConfiguracion
				open={modalErroresOpen}
				onClose={cerrarModalErrores}
				registrosConError={registrosConError}
			/>
			<ModalVerNegocio
				idBusiness={selectedBusinessId}
				open={modalVerNegocioOpen}
				onOpenChange={(open) => {
					setModalVerNegocioOpen(open)
					if (!open) setSelectedBusinessId(null)
				}}
			/>
			<ModalDetalleDistribucion
				idSettlementCommission={selectedCommissionId}
				open={modalDistribucionOpen}
				onClose={() => {
					setModalDistribucionOpen(false)
					setSelectedCommissionId(null)
				}}
			/>
		</DashboardLayout>
	)
}
