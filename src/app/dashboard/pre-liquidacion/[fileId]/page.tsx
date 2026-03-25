'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
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

	const { execute: executeLiquidar, state: liquidarState } =
		useLiquidarRegistros()
	const { execute: executeRezagar, state: rezagarState } = useRezagarRegistros()

	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
	const [modalLiquidarOpen, setModalLiquidarOpen] = useState(false)
	const [modalRezagarOpen, setModalRezagarOpen] = useState(false)
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
			if (result.fileCompleted) {
				router.push('/dashboard/pre-liquidacion')
			}
		}
	}

	async function handleConfirmarRezagar() {
		if (selectedIds.size === 0) return
		const ids = Array.from(selectedIds)
		const result = await executeRezagar(ids)
		if (result) {
			setSelectedIds(new Set())
			setModalRezagarOpen(false)
			await refetch()
		}
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
			<div className="space-y-4 p-4">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="sm"
						asChild
						className="cursor-pointer"
					>
						<Link href="/dashboard/pre-liquidacion">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Volver
						</Link>
					</Button>
					<div className="flex-1">
						<h1 className="text-lg font-semibold text-foreground">
							Comisiones pre-liquidadas
						</h1>
						{archivo && (
							<p className="text-sm text-muted-foreground">
								{archivo.nombreArchivo} · registros en estado PRE-LIQUIDADO
							</p>
						)}
					</div>
				</div>

				{error && (
					<div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
						{error}
					</div>
				)}

				{isLoading ? (
					<div className="py-8 text-center text-muted-foreground">
						Cargando comisiones pre-liquidadas...
					</div>
				) : registros.length === 0 ? (
					<div className="py-8 text-center text-muted-foreground">
						No hay comisiones pre-liquidadas para este archivo.
					</div>
				) : (
					<>
						{archivo && (
							<h2 className="text-lg font-semibold text-foreground">
								{archivo.fileType === 'VOLUNTARIA'
									? 'PRE-LIQUIDADAS VOLUNTARIA'
									: 'PRE-LIQUIDADAS POLIZA'}
							</h2>
						)}
						<RegistrosLiquidacionTable
							registros={registros}
							fileType={archivo?.fileType ?? ''}
							selectedIds={selectedIds}
							onSelectionChange={setSelectedIds}
							onVerNegocio={handleVerNegocio}
							onVerDistribucion={handleVerDistribucion}
						/>
						{/* Liquidar/Rezagar actions are disabled — records are PRE-SETTLED, not SYNCHRONIZED */}
						<BarraAccionesLiquidacion
							selectedCount={0}
							onLiquidar={handleLiquidar}
							onRezagar={handleRezagar}
							isLiquidando={isLiquidando}
							isRezagando={isRezagando}
						/>
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
