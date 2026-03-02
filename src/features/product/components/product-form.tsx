'use client'

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import {
	createProductSchema,
	updateProductSchema,
	type CreateProductFormData,
	type UpdateProductFormData,
} from '../lib/product-schemas'
import type { Product, CompanyOption } from '../types/product.types'
import { cn } from '@/lib/utils'

interface ProductFormProps {
	mode: 'create' | 'edit'
	initialData?: Product
	companies: CompanyOption[]
	onSubmit: (
		data: CreateProductFormData | UpdateProductFormData
	) => Promise<void>
	onCancel?: () => void
	isLoading?: boolean
}

export function ProductForm({
	mode,
	initialData,
	companies,
	onSubmit,
	onCancel,
	isLoading = false,
}: ProductFormProps) {
	const schema = mode === 'create' ? createProductSchema : updateProductSchema

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		control,
	} = useForm<CreateProductFormData | UpdateProductFormData>({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		resolver: zodResolver(schema) as any,
		defaultValues: initialData
			? {
					name: initialData.name,
					idCompany: initialData.idCompany,
					status: initialData.status,
				}
			: {
					name: '',
					idCompany: undefined,
					status: true,
				},
	})

	const handleFormSubmit = async (
		data: CreateProductFormData | UpdateProductFormData
	) => {
		await onSubmit(data)
	}

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
			{/* Compañía */}
			<div className="space-y-2">
				<Label htmlFor="idCompany">
					Compañía
					<span className="text-destructive ml-1">*</span>
				</Label>
				<Controller
					name="idCompany"
					control={control}
					render={({ field }) => (
						<Select
							value={field.value?.toString()}
							onValueChange={(value) => field.onChange(parseInt(value, 10))}
							disabled={isLoading}
						>
							<SelectTrigger
								className={cn(errors.idCompany && 'border-destructive')}
							>
								<SelectValue placeholder="Seleccione una compañía" />
							</SelectTrigger>
							<SelectContent>
								{companies.map((company) => (
									<SelectItem
										key={company.idCompany}
										value={company.idCompany.toString()}
									>
										{company.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
				{errors.idCompany && (
					<p className="text-sm text-destructive">
						{errors.idCompany.message as string}
					</p>
				)}
			</div>

			{/* Nombre del Producto */}
			<div className="space-y-2">
				<Label htmlFor="name">
					Nombre del Producto
					<span className="text-destructive ml-1">*</span>
				</Label>
				<Input
					id="name"
					{...register('name')}
					placeholder="Ej: Seguro de Vida"
					disabled={isLoading}
					className={cn(errors.name && 'border-destructive')}
				/>
				{errors.name && (
					<p className="text-sm text-destructive">
						{errors.name.message as string}
					</p>
				)}
			</div>

			{/* Estado */}
			<div className="space-y-2">
				<Label htmlFor="status">
					Estado
					<span className="text-destructive ml-1">*</span>
				</Label>
				<Controller
					name="status"
					control={control}
					render={({ field }) => (
						<Select
							value={field.value ? 'Activo' : 'Inactivo'}
							onValueChange={(value) => field.onChange(value === 'Activo')}
							disabled={isLoading}
						>
							<SelectTrigger
								className={cn(errors.status && 'border-destructive')}
							>
								<SelectValue placeholder="Seleccione un estado" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Activo">Activo</SelectItem>
								<SelectItem value="Inactivo">Inactivo</SelectItem>
							</SelectContent>
						</Select>
					)}
				/>
				{errors.status && (
					<p className="text-sm text-destructive">
						{errors.status.message as string}
					</p>
				)}
			</div>

			{/* Botones de acción */}
			<div className="flex justify-end gap-3 pt-4">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isLoading || isSubmitting}
					>
						Cancelar
					</Button>
				)}
				<Button type="submit" disabled={isLoading || isSubmitting}>
					{isSubmitting || isLoading
						? 'Guardando...'
						: mode === 'create'
							? 'Guardar'
							: 'Actualizar'}
				</Button>
			</div>
		</form>
	)
}
