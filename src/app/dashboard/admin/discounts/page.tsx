'use client'

import { useState } from 'react'
import { Plus, Percent, RotateCcw } from 'lucide-react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/features/shared/ui/dialog'
import { CommissionDiscountsTable } from '@/features/commission-discounts/components/commission-discounts-table'
import { CommissionDiscountForm } from '@/features/commission-discounts/components/commission-discount-form'
import { InactivateConfirmModal } from '@/features/commission-discounts/components/inactivate-confirm-modal'
import { useCommissionDiscounts } from '@/features/commission-discounts/hooks/use-commission-discounts'
import { useCommissionDiscountMutations } from '@/features/commission-discounts/hooks/use-commission-discount-mutations'
import type { CommissionDiscount } from '@/features/commission-discounts/types/commission-discount.types'
import type { CreateCommissionDiscountData } from '@/features/commission-discounts/lib/commission-discount-schemas'

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString('es-CO', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	})
}

function KpiCard({
	discount,
	icon,
	label,
}: {
	discount: CommissionDiscount | undefined
	icon: React.ReactNode
	label: string
}) {
	return (
		<div
			className="flex-1 rounded-lg p-5 flex flex-col gap-2.5"
			style={{
				backgroundColor: '#FFFFFF',
				border: '1px solid #DDE9EB',
				boxShadow: '0 1px 3px #0000000D',
			}}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					{icon}
					<span
						className="text-[11px] font-semibold tracking-[0.5px]"
						style={{ color: '#529398' }}
					>
						{label}
					</span>
				</div>
				{discount ? (
					<span
						className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
						style={{ backgroundColor: '#dcfce7', color: '#166534' }}
					>
						<span
							className="inline-block rounded-full"
							style={{ width: 5, height: 5, backgroundColor: '#16A34A' }}
						/>
						Activo
					</span>
				) : (
					<span
						className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
						style={{ backgroundColor: '#F1F5F5', color: '#529398' }}
					>
						<span
							className="inline-block rounded-full"
							style={{ width: 5, height: 5, backgroundColor: '#DDE9EB' }}
						/>
						Sin activo
					</span>
				)}
			</div>
			<p className="text-[34px] font-bold leading-none" style={{ color: '#00545c' }}>
				{discount ? `${Number(discount.percentage).toFixed(2)}%` : '—'}
			</p>
			<p className="text-[13px]" style={{ color: '#529398' }}>
				{discount?.name ?? 'No hay descuento activo'}
			</p>
			{discount && (
				<p className="text-[11px]" style={{ color: '#DDE9EB' }}>
					Creado: {formatDate(discount.createdAt)}
					{discount.createdBy ? ` · ${discount.createdBy.name}` : ''}
				</p>
			)}
		</div>
	)
}

export default function DiscountsAdminPage() {
	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [inactivateTarget, setInactivateTarget] = useState<CommissionDiscount | null>(null)

	const { state, refresh } = useCommissionDiscounts()

	const discounts = state.status === 'success' ? state.data : []
	const activeImpuesto = discounts.find((d) => d.type === 'IMPUESTO' && d.status === 'ACTIVE')
	const activeClawback = discounts.find((d) => d.type === 'CLAWBACK' && d.status === 'ACTIVE')

	const { createDiscount, inactivateDiscount, isSubmitting } = useCommissionDiscountMutations({
		onSuccess: () => {
			setIsCreateOpen(false)
			setInactivateTarget(null)
			refresh()
		},
	})

	const handleCreate = async (data: CreateCommissionDiscountData) => {
		await createDiscount(data)
	}

	const handleInactivateConfirm = async () => {
		if (!inactivateTarget) return
		await inactivateDiscount(inactivateTarget.id)
	}

	return (
		<DashboardLayout currentPage="Administración">
			<div className="space-y-5">
				{/* Page header */}
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-1">
						<h1 className="text-[26px] font-bold leading-tight" style={{ color: '#00545c' }}>
							Descuentos
						</h1>
						<p className="text-[13px]" style={{ color: '#529398' }}>
							Gestiona los descuentos de impuesto y clawback
						</p>
					</div>
					<button
						onClick={() => setIsCreateOpen(true)}
						className="inline-flex items-center gap-2 rounded-md px-4 h-9 text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-90"
						style={{ backgroundColor: '#00545c', color: '#FFFFFF' }}
					>
						<Plus className="h-3.5 w-3.5" />
						Crear Descuento
					</button>
				</div>

				{/* KPI cards */}
				<div className="flex gap-4">
					<KpiCard
						discount={activeImpuesto}
						icon={<Percent className="h-3.5 w-3.5" style={{ color: '#529398' }} />}
						label="IMPUESTO ACTIVO"
					/>
					<KpiCard
						discount={activeClawback}
						icon={<RotateCcw className="h-3.5 w-3.5" style={{ color: '#529398' }} />}
						label="CLAWBACK ACTIVO"
					/>
				</div>

				{/* Table */}
				{state.status === 'error' ? (
					<div
						className="rounded-lg px-4 py-3 text-[13px]"
						style={{
							backgroundColor: '#FEF2F2',
							border: '1px solid #FECACA',
							color: '#ED4337',
						}}
						role="alert"
					>
						{state.error || 'Error al cargar descuentos'}
					</div>
				) : (
					<CommissionDiscountsTable
						discounts={discounts}
						isLoading={state.status === 'loading'}
						onInactivate={setInactivateTarget}
					/>
				)}

				{/* Create modal */}
				<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
					<DialogContent
						className="p-0 overflow-hidden"
						style={{ borderColor: '#DDE9EB', backgroundColor: '#FFFFFF', maxWidth: 420 }}
					>
						<DialogHeader
							className="px-6 pb-4 pt-5"
							style={{ borderBottom: '1px solid #DDE9EB' }}
						>
							<DialogTitle className="text-[18px] font-bold" style={{ color: '#00545c' }}>
								Crear Descuento
							</DialogTitle>
							<DialogDescription className="text-[13px]" style={{ color: '#529398' }}>
								Completa el formulario para crear un nuevo descuento de comisión
							</DialogDescription>
						</DialogHeader>
						<CommissionDiscountForm
							existingDiscounts={discounts}
							onSubmit={handleCreate}
							isLoading={isSubmitting}
							onCancel={() => setIsCreateOpen(false)}
						/>
					</DialogContent>
				</Dialog>

				{/* Inactivate confirm modal */}
				<InactivateConfirmModal
					discount={inactivateTarget}
					isOpen={inactivateTarget !== null}
					onConfirm={handleInactivateConfirm}
					onCancel={() => setInactivateTarget(null)}
					isLoading={isSubmitting}
				/>
			</div>
		</DashboardLayout>
	)
}
