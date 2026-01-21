'use client'

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/features/shared/ui/button'
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
	createCategorySchema,
	updateCategorySchema,
	type CreateCategoryFormData,
	type UpdateCategoryFormData,
} from '../lib/category-schemas'
import type { Category } from '../types/category.types'
import { CATEGORY_TYPES } from '../types/category.types'
import { cn } from '@/lib/utils'

interface CategoryFormProps {
	mode: 'create' | 'edit'
	initialData?: Category
	onSubmit: (
		data: CreateCategoryFormData | UpdateCategoryFormData
	) => Promise<void>
	onCancel?: () => void
	isLoading?: boolean
}

const CATEGORY_TYPE_LABELS: Record<string, string> = {
	MMS: 'MMS',
	ALIADO: 'Aliado',
	TRINITY: 'Trinity',
}

export function CategoryForm({
	mode,
	initialData,
	onSubmit,
	onCancel,
	isLoading = false,
}: CategoryFormProps) {
	const schema = mode === 'create' ? createCategorySchema : updateCategorySchema

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		control,
	} = useForm<CreateCategoryFormData | UpdateCategoryFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			code: initialData?.code ?? '',
			name: initialData?.name ?? '',
			typeCategory: initialData?.typeCategory ?? undefined,
			descripcion: initialData?.descripcion ?? '',
			status: initialData?.status ?? true,
		},
	})

	const handleFormSubmit = async (
		data: CreateCategoryFormData | UpdateCategoryFormData
	) => {
		await onSubmit(data)
	}

	const isFormDisabled = isLoading || isSubmitting

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
			{/* Code Field */}
			<div className="space-y-2">
				<Label htmlFor="code">
					Código <span className="text-destructive">*</span>
				</Label>
				<Input
					id="code"
					placeholder="Ingrese el código de la categoría"
					disabled={isFormDisabled}
					className={cn(errors.code && 'border-destructive')}
					{...register('code')}
				/>
				{errors.code && (
					<p className="text-sm text-destructive">{errors.code.message}</p>
				)}
			</div>

			{/* Name Field */}
			<div className="space-y-2">
				<Label htmlFor="name">
					Nombre de la Categoría <span className="text-destructive">*</span>
				</Label>
				<Input
					id="name"
					placeholder="Ingrese el nombre de la categoría"
					disabled={isFormDisabled}
					className={cn(errors.name && 'border-destructive')}
					{...register('name')}
				/>
				{errors.name && (
					<p className="text-sm text-destructive">{errors.name.message}</p>
				)}
			</div>

			{/* Type Category Field */}
			<div className="space-y-2">
				<Label htmlFor="typeCategory">
					Tipo de Categoría <span className="text-destructive">*</span>
				</Label>
				<Controller
					name="typeCategory"
					control={control}
					render={({ field }) => (
						<Select
							onValueChange={field.onChange}
							defaultValue={field.value}
							disabled={isFormDisabled}
						>
							<SelectTrigger
								className={cn(errors.typeCategory && 'border-destructive')}
							>
								<SelectValue placeholder="Seleccione un tipo" />
							</SelectTrigger>
							<SelectContent>
								{CATEGORY_TYPES.map((type) => (
									<SelectItem key={type} value={type}>
										{CATEGORY_TYPE_LABELS[type] || type}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
				{errors.typeCategory && (
					<p className="text-sm text-destructive">{errors.typeCategory.message}</p>
				)}
			</div>

			{/* Description Field */}
			<div className="space-y-2">
				<Label htmlFor="descripcion">Descripción</Label>
				<Textarea
					id="descripcion"
					placeholder="Ingrese una descripción (opcional)"
					disabled={isFormDisabled}
					rows={3}
					{...register('descripcion')}
				/>
			</div>

			{/* Status Field */}
			<div className="space-y-2">
				<Label htmlFor="status">
					Estado <span className="text-destructive">*</span>
				</Label>
				<Controller
					name="status"
					control={control}
					render={({ field }) => (
						<Select
							onValueChange={(value) => field.onChange(value === 'true')}
							defaultValue={field.value ? 'true' : 'false'}
							disabled={isFormDisabled}
						>
							<SelectTrigger
								className={cn(errors.status && 'border-destructive')}
							>
								<SelectValue placeholder="Seleccione un estado" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="true">Activo</SelectItem>
								<SelectItem value="false">Inactivo</SelectItem>
							</SelectContent>
						</Select>
					)}
				/>
				{errors.status && (
					<p className="text-sm text-destructive">{errors.status.message}</p>
				)}
			</div>

			{/* Form Actions */}
			<div className="flex justify-end gap-3 pt-4">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isFormDisabled}
					>
						Cancelar
					</Button>
				)}
				<Button type="submit" disabled={isFormDisabled}>
					{isLoading || isSubmitting
						? mode === 'create'
							? 'Creando...'
							: 'Guardando...'
						: mode === 'create'
							? 'Crear Categoría'
							: 'Guardar Cambios'}
				</Button>
			</div>
		</form>
	)
}
