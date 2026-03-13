'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { Textarea } from '@/features/shared/ui/textarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import {
	createCommissionDiscountSchema,
	type CreateCommissionDiscountData,
} from '@/features/commission-discounts/lib/commission-discount-schemas'
import type { CommissionDiscount } from '@/features/commission-discounts/types/commission-discount.types'
import { Plus } from 'lucide-react'

interface CommissionDiscountFormProps {
	existingDiscounts: CommissionDiscount[]
	onSubmit: (data: CreateCommissionDiscountData) => Promise<void>
	onCancel: () => void
	isLoading: boolean
}

export function CommissionDiscountForm({
	existingDiscounts,
	onSubmit,
	onCancel,
	isLoading,
}: CommissionDiscountFormProps) {
	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors },
	} = useForm<CreateCommissionDiscountData>({
		resolver: zodResolver(createCommissionDiscountSchema),
	})

	const selectedType = watch('type')

	const hasActiveForType =
		selectedType != null &&
		existingDiscounts.some((d) => d.type === selectedType && d.status === 'ACTIVE')

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			{/* Body */}
			<div className="px-6 py-5 flex flex-col gap-4">
				{/* Nombre */}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="name" className="text-[13px] font-medium" style={{ color: '#00545c' }}>
						Nombre *
					</Label>
					<Input
						id="name"
						placeholder="Ej: Impuesto estándar 2026"
						{...register('name')}
						className="h-9 text-[13px]"
						style={{ borderColor: '#DDE9EB' }}
					/>
					{errors.name && (
						<p className="text-[12px] text-red-500">{errors.name.message}</p>
					)}
				</div>

				{/* Tipo */}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="type" className="text-[13px] font-medium" style={{ color: '#00545c' }}>
						Tipo *
					</Label>
					<Select onValueChange={(v) => setValue('type', v as 'IMPUESTO' | 'CLAWBACK')}>
						<SelectTrigger
							id="type"
							className="h-9 text-[13px]"
							style={
								selectedType
									? {
											borderColor: '#00545c',
											borderWidth: 2,
											boxShadow: '0 0 0 2px #00545c30',
										}
									: { borderColor: '#DDE9EB' }
							}
						>
							<SelectValue placeholder="Seleccionar tipo" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="IMPUESTO">IMPUESTO</SelectItem>
							<SelectItem value="CLAWBACK">CLAWBACK</SelectItem>
						</SelectContent>
					</Select>
					{errors.type && (
						<p className="text-[12px] text-red-500">{errors.type.message}</p>
					)}
					{hasActiveForType && (
						<div
							className="rounded-md px-2.5 py-2 text-[12px] flex items-start gap-2"
							style={{ backgroundColor: '#FFFBEB', border: '1px solid #F59E0B', color: '#92400E' }}
						>
							Ya existe un descuento activo de tipo <strong>{selectedType}</strong>. Inactívalo primero.
						</div>
					)}
				</div>

				{/* Porcentaje */}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="percentage" className="text-[13px] font-medium" style={{ color: '#00545c' }}>
						Porcentaje (%) *
					</Label>
					<Input
						id="percentage"
						type="number"
						step="0.01"
						min="0.01"
						max="100"
						placeholder="12.00"
						{...register('percentage', { valueAsNumber: true })}
						className="h-9 text-[13px]"
						style={{ borderColor: '#DDE9EB' }}
					/>
					<p className="text-[11px]" style={{ color: '#529398' }}>
						Valor entre 0.01 y 100
					</p>
					{errors.percentage && (
						<p className="text-[12px] text-red-500">{errors.percentage.message}</p>
					)}
				</div>

				{/* Descripción */}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="description" className="text-[13px] font-medium" style={{ color: '#00545c' }}>
						Descripción
					</Label>
					<Textarea
						id="description"
						placeholder="Descripción del descuento..."
						{...register('description')}
						className="text-[13px] min-h-[72px]"
						style={{ borderColor: '#DDE9EB' }}
					/>
				</div>
			</div>

			{/* Footer */}
			<div
				className="flex items-center justify-end gap-2.5 px-6 py-3.5"
				style={{ borderTop: '1px solid #DDE9EB' }}
			>
				<button
					type="button"
					onClick={onCancel}
					className="inline-flex items-center justify-center rounded-md px-4 h-9 text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-80"
					style={{
						backgroundColor: '#FFFFFF',
						border: '1px solid #DDE9EB',
						color: '#529398',
					}}
				>
					Cancelar
				</button>
				<button
					type="submit"
					disabled={isLoading}
					className="inline-flex items-center gap-2 rounded-md px-4 h-9 text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
					style={{ backgroundColor: '#00545c', color: '#FFFFFF' }}
				>
					<Plus className="h-3.5 w-3.5" />
					{isLoading ? 'Creando...' : 'Crear Descuento'}
				</button>
			</div>
		</form>
	)
}
