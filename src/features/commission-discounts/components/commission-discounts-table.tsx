'use client'

import { Skeleton } from '@/features/shared/ui/skeleton'
import type { CommissionDiscount } from '@/features/commission-discounts/types/commission-discount.types'

interface CommissionDiscountsTableProps {
	discounts: CommissionDiscount[]
	isLoading: boolean
	onInactivate: (discount: CommissionDiscount) => void
}

function TypeBadge({ type, isActive }: { type: string; isActive: boolean }) {
	if (type === 'IMPUESTO') {
		return isActive ? (
			<span
				className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold"
				style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
			>
				IMPUESTO
			</span>
		) : (
			<span
				className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold"
				style={{ backgroundColor: '#F1F5F5', color: '#529398' }}
			>
				IMPUESTO
			</span>
		)
	}
	return (
		<span
			className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold truncate"
			style={{ backgroundColor: '#FFFBEB', color: '#B45309' }}
		>
			CLAWBACK
		</span>
	)
}

function StatusBadge({ status }: { status: string }) {
	const isActive = status === 'ACTIVE'
	return (
		<span
			className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
			style={
				isActive
					? { backgroundColor: '#dcfce7', color: '#166534' }
					: { backgroundColor: '#F1F5F5', color: '#529398' }
			}
		>
			<span
				className="inline-block rounded-full"
				style={{
					width: 5,
					height: 5,
					backgroundColor: isActive ? '#16A34A' : '#DDE9EB',
					flexShrink: 0,
				}}
			/>
			{isActive ? 'Activo' : 'Inactivo'}
		</span>
	)
}

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString('es-CO', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	})
}

export function CommissionDiscountsTable({
	discounts,
	isLoading,
	onInactivate,
}: CommissionDiscountsTableProps) {
	if (isLoading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-14 w-full" />
				))}
			</div>
		)
	}

	return (
		<div
			className="overflow-hidden rounded-lg"
			style={{
				border: '1px solid #DDE9EB',
				boxShadow: '0 1px 3px #0000000D',
				backgroundColor: '#FFFFFF',
			}}
		>
			{/* Header */}
			<div
				className="flex items-center px-4"
				style={{
					backgroundColor: '#F1F5F5',
					height: 40,
					borderBottom: '1px solid #DDE9EB',
				}}
			>
				<span className="w-[210px] text-[11px] font-semibold tracking-[0.5px] shrink-0" style={{ color: '#529398' }}>
					NOMBRE
				</span>
				<span className="w-[110px] text-[11px] font-semibold tracking-[0.5px] shrink-0" style={{ color: '#529398' }}>
					TIPO
				</span>
				<span className="w-[110px] text-[11px] font-semibold tracking-[0.5px] shrink-0" style={{ color: '#529398' }}>
					PORCENTAJE
				</span>
				<span className="w-[100px] text-[11px] font-semibold tracking-[0.5px] shrink-0" style={{ color: '#529398' }}>
					ESTADO
				</span>
				<span className="w-[130px] text-[11px] font-semibold tracking-[0.5px] shrink-0" style={{ color: '#529398' }}>
					CREADO
				</span>
				<span className="flex-1 text-right text-[11px] font-semibold tracking-[0.5px]" style={{ color: '#529398' }}>
					ACCIONES
				</span>
			</div>

			{/* Rows */}
			{discounts.length === 0 ? (
				<div className="py-10 text-center text-sm" style={{ color: '#529398' }}>
					No hay descuentos registrados
				</div>
			) : (
				discounts.map((discount, idx) => {
					const isActive = discount.status === 'ACTIVE'
					const isLast = idx === discounts.length - 1
					return (
						<div
							key={discount.id}
							className="flex items-center px-4"
							style={{
								backgroundColor: isActive ? '#FFFFFF' : '#FAFAFA',
								height: 54,
								borderBottom: isLast ? 'none' : '1px solid #F1F5F5',
							}}
						>
							{/* Nombre + descripción */}
							<div className="w-[210px] shrink-0 flex flex-col justify-center gap-0.5">
								<span
									className="text-[13px] font-medium leading-tight"
									style={{ color: isActive ? '#111827' : '#529398' }}
								>
									{discount.name}
								</span>
								<span className="text-[11px]" style={{ color: isActive ? '#529398' : '#DDE9EB' }}>
									{discount.description ?? (isActive ? 'Vigente en liquidaciones' : 'Reemplazado')}
								</span>
							</div>

							{/* Tipo */}
							<div className="w-[110px] shrink-0">
								<TypeBadge type={discount.type} isActive={isActive} />
							</div>

							{/* Porcentaje */}
							<div className="w-[110px] shrink-0">
								<span
									className="text-[13px] font-semibold"
									style={{ color: isActive ? '#00545c' : '#DDE9EB' }}
								>
									{Number(discount.percentage).toFixed(2)}%
								</span>
							</div>

							{/* Estado */}
							<div className="w-[100px] shrink-0">
								<StatusBadge status={discount.status} />
							</div>

							{/* Creado */}
							<div className="w-[130px] shrink-0">
								<span
									className="text-[12px]"
									style={{ color: isActive ? '#529398' : '#DDE9EB' }}
								>
									{formatDate(discount.createdAt)}
								</span>
							</div>

							{/* Acciones */}
							<div className="flex-1 flex justify-end">
								{isActive ? (
									<button
										onClick={() => onInactivate(discount)}
										className="cursor-pointer rounded-md px-2.5 py-1 text-[12px] font-medium transition-opacity hover:opacity-80"
										style={{
											backgroundColor: '#FEF2F2',
											border: '1px solid #FECACA',
											color: '#ED4337',
										}}
									>
										Inactivar
									</button>
								) : (
									<span className="text-[13px]" style={{ color: '#DDE9EB' }}>
										—
									</span>
								)}
							</div>
						</div>
					)
				})
			)}
		</div>
	)
}
