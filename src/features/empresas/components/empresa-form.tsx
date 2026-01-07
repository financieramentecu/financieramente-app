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
	createEmpresaSchema,
	updateEmpresaSchema,
	type CreateEmpresaFormData,
	type UpdateEmpresaFormData,
} from '../lib/empresa-schemas'
import type { Empresa } from '../types/empresa.types'
import { cn } from '@/lib/utils'

interface EmpresaFormProps {
	mode: 'create' | 'edit'
	initialData?: Empresa
	onSubmit: (data: CreateEmpresaFormData | UpdateEmpresaFormData) => Promise<void>
	onCancel?: () => void
	isLoading?: boolean
}

export function EmpresaForm({
	mode,
	initialData,
	onSubmit,
	onCancel,
	isLoading = false,
}: EmpresaFormProps) {
	const schema = mode === 'create' ? createEmpresaSchema : updateEmpresaSchema
	const isEditMode = mode === 'edit'

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		control,
	} = useForm<CreateEmpresaFormData | UpdateEmpresaFormData>({
		resolver: zodResolver(schema),
		defaultValues: initialData
			? {
					name: initialData.name,
					status: initialData.status,
				}
			: {
					name: '',
					status: true,
				},
	})

	const handleFormSubmit = async (
		data: CreateEmpresaFormData | UpdateEmpresaFormData
	) => {
		await onSubmit(data)
	}

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
			{/* Nombre */}
			<div className="space-y-2">
				<Label htmlFor="name">
					Nombre Completo de la Agencia
					<span className="text-destructive ml-1">*</span>
				</Label>
				<Input
					id="name"
					{...register('name')}
					placeholder="Ej: Skandia Seguros"
					disabled={isEditMode || isLoading}
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
							value={field.value ? 'Activa' : 'Inactiva'}
							onValueChange={(value) => field.onChange(value === 'Activa')}
							disabled={isLoading}
						>
							<SelectTrigger
								className={cn(errors.status && 'border-destructive')}
							>
								<SelectValue placeholder="Seleccione un estado" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Activa">Activa</SelectItem>
								<SelectItem value="Inactiva">Inactiva</SelectItem>
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

