'use client'

import React from 'react'
import { useForm, Controller, DefaultValues } from 'react-hook-form'
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
	type CreateCategoryFormData,
	type UpdateCategoryFormData,
} from '../lib/category-schemas'
import type { Category, CategoryType } from '../types/category.types'
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

// Hardcoded for now to unblock build, ideally fetched from API
const CATEGORY_TYPE_OPTIONS: { id: number; label: CategoryType }[] = [
	{ id: 1, label: 'MMS' },
	{ id: 2, label: 'ALIADO' },
	{ id: 3, label: 'TRINITY' },
]

type FormValues = CreateCategoryFormData

export function CategoryForm({
	mode,
	initialData,
	onSubmit: submitHandler,
	onCancel,
	isLoading = false,
}: CategoryFormProps) {
	const form = useForm<FormValues>({
		resolver: zodResolver(createCategorySchema),
		defaultValues: (initialData
			? {
				code: initialData.code,
				name: initialData.name,
				typeCategory: initialData.typeCategory as CategoryType,
				descripcion: initialData.descripcion,
				status: initialData.status,
			}
			: {
				code: '',
				name: '',
				typeCategory: 'MMS' as CategoryType,
				descripcion: '',
				status: true,
			}) as DefaultValues<FormValues>,
	})

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		control,
	} = form

	const handleFormSubmit = async (data: FormValues) => {
		await submitHandler(data)
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
							value={field.value}
						>
							<SelectTrigger
								className={cn(errors.typeCategory && 'border-destructive')}
							>
								<SelectValue placeholder="Seleccione un tipo" />
							</SelectTrigger>
							<SelectContent>
								{CATEGORY_TYPE_OPTIONS.map((type) => (
									<SelectItem key={type.id} value={type.label}>
										{type.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
				{errors.typeCategory && (
					<p className="text-sm text-destructive">
						{errors.typeCategory.message}
					</p>
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
							value={field.value ? 'true' : 'false'}
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
					<p className="text-sm text-destructive">
						{errors.status.message}
					</p>
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
