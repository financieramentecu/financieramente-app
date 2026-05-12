'use client'

import React, { useEffect } from 'react'
import { useForm, Controller, DefaultValues, type Resolver } from 'react-hook-form'
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
import type { Category } from '../types/category.types'
import { cn } from '@/lib/utils'

interface CategoryFormProps {
	mode: 'create' | 'edit'
	initialData?: Category
	onSubmit: (data: CreateCategoryFormData | UpdateCategoryFormData) => Promise<void>
	onCancel?: () => void
	isLoading?: boolean
}

type FormValues = CreateCategoryFormData

export function CategoryForm({
	mode,
	initialData,
	onSubmit: submitHandler,
	onCancel,
	isLoading = false,
}: CategoryFormProps) {
	// Fetch active category types from API
	const [categoryTypes, setCategoryTypes] = React.useState<
		{ id: number; name: string }[]
	>([])

	useEffect(() => {
		fetch('/api/category-types/active')
			.then((res) => res.json())
			.then((data) => {
				if (data?.data) {
					setCategoryTypes(data.data)
				}
			})
			.catch(() => {
				// silently ignore fetch errors in form
			})
	}, [])

	const form = useForm<FormValues>({
		resolver: zodResolver(createCategorySchema) as Resolver<FormValues>,
		defaultValues: (initialData
			? {
				name: initialData.name,
				idCategoryType: initialData.idCategoryType,
				description: initialData.description ?? '',
				status: initialData.status,
			}
			: {
				name: '',
				idCategoryType: undefined,
				description: '',
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
			{/* Name Field */}
			<div className="space-y-2">
				<Label htmlFor="name">
					Nombre <span className="text-destructive">*</span>
				</Label>
				<Input
					id="name"
					placeholder="Nombre de la categoría"
					disabled={isFormDisabled}
					aria-label="Nombre"
					className={cn(errors.name && 'border-destructive')}
					{...register('name')}
				/>
				{errors.name && (
					<p className="text-sm text-destructive">{errors.name.message}</p>
				)}
			</div>

			{/* Category Type Field */}
			<div className="space-y-2">
				<Label htmlFor="idCategoryType">
					Tipo de categoría <span className="text-destructive">*</span>
				</Label>
				<Controller
					name="idCategoryType"
					control={control}
					render={({ field }) => (
						<Select
							onValueChange={(val) => field.onChange(Number(val))}
							value={field.value != null ? String(field.value) : ''}
							disabled={isFormDisabled}
						>
							<SelectTrigger
								className={cn(errors.idCategoryType && 'border-destructive')}
							>
								<SelectValue placeholder="Seleccione un tipo" />
							</SelectTrigger>
							<SelectContent>
								{categoryTypes.map((type) => (
									<SelectItem key={type.id} value={String(type.id)}>
										{type.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
				{errors.idCategoryType && (
					<p className="text-sm text-destructive">
						{errors.idCategoryType.message}
					</p>
				)}
			</div>

			{/* Description Field */}
			<div className="space-y-2">
				<Label htmlFor="description">Descripción</Label>
				<Textarea
					id="description"
					placeholder="Ingrese una descripción (opcional)"
					disabled={isFormDisabled}
					rows={3}
					{...register('description')}
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
