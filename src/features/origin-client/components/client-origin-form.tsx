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
	createClientOriginSchema,
	updateClientOriginSchema,
	type CreateClientOriginFormData,
	type UpdateClientOriginFormData,
} from '../lib/client-origin-schemas'
import type { ClientOrigin } from '../types/client-origin.types'
import { cn } from '@/lib/utils'

interface ClientOriginFormProps {
	mode: 'create' | 'edit'
	initialData?: ClientOrigin
	onSubmit: (
		data: CreateClientOriginFormData | UpdateClientOriginFormData
	) => Promise<void>
	onCancel?: () => void
	isLoading?: boolean
}

export function ClientOriginForm({
	mode,
	initialData,
	onSubmit,
	onCancel,
	isLoading = false,
}: ClientOriginFormProps) {
	const schema =
		mode === 'create'
			? createClientOriginSchema
			: updateClientOriginSchema

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		control,
	} = useForm<CreateClientOriginFormData | UpdateClientOriginFormData>({
		resolver: zodResolver(schema),
		defaultValues: initialData
			? {
					name: initialData.name,
					description: initialData.description ?? '',
					status: initialData.status,
				}
			: {
					name: '',
					description: '',
					status: true,
				},
	})

	const handleFormSubmit = async (
		data: CreateClientOriginFormData | UpdateClientOriginFormData
	) => {
		await onSubmit(data)
	}

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
			{/* Nombre */}
			<div className="space-y-2">
				<Label htmlFor="name">
					Nombre del Origen
					<span className="text-destructive ml-1">*</span>
				</Label>
				<Input
					id="name"
					{...register('name')}
					placeholder="Ej: Propio, Default, Referido"
					disabled={isLoading}
					className={cn(errors.name && 'border-destructive')}
				/>
				{errors.name && (
					<p className="text-sm text-destructive">
						{errors.name.message as string}
					</p>
				)}
			</div>

			{/* Descripción */}
			<div className="space-y-2">
				<Label htmlFor="description">Descripción</Label>
				<Textarea
					id="description"
					{...register('description')}
					placeholder="Descripción opcional del origen de cliente"
					disabled={isLoading}
					className={cn(errors.description && 'border-destructive')}
					rows={3}
				/>
				{errors.description && (
					<p className="text-sm text-destructive">
						{errors.description.message as string}
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

