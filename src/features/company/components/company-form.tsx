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
	createCompanySchema,
	updateCompanySchema,
	type CreateCompanyFormData,
	type UpdateCompanyFormData,
} from '../lib/company-schemas'
import type { Company } from '../types/company.types'
import { cn } from '@/lib/utils'

interface CompanyFormProps {
	mode: 'create' | 'edit'
	initialData?: Company
	onSubmit: (
		data: CreateCompanyFormData | UpdateCompanyFormData
	) => Promise<void>
	onCancel?: () => void
	isLoading?: boolean
	currencies: { idCurrency: number; name: string }[]
}

export function CompanyForm({
	mode,
	initialData,
	onSubmit,
	onCancel,
	isLoading = false,
	currencies,
}: CompanyFormProps) {
	const schema = mode === 'create' ? createCompanySchema : updateCompanySchema
	const isEditMode = mode === 'edit'

	const form = useForm<CreateCompanyFormData | UpdateCompanyFormData>({
		resolver: zodResolver(schema),
		defaultValues: initialData
			? {
					name: initialData.name,
					status: initialData.status,
					idCurrency: initialData.idCurrency?.toString() || '',
				}
			: {
					name: '',
					status: true,
					idCurrency: '',
				},
	})

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		control,
		setValue,
	} = form

	// Set initial idCurrency when editing
	React.useEffect(() => {
		if (initialData?.idCurrency) {
			setValue('idCurrency', initialData.idCurrency.toString())
		}
	}, [initialData, setValue])

	const handleFormSubmit = async (
		data: CreateCompanyFormData | UpdateCompanyFormData
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

			{/* Moneda */}
			<div className="space-y-2">
				<Label htmlFor="idCurrency">
					Moneda Predeterminada
					<span className="text-destructive ml-1">*</span>
				</Label>
				<Controller
					name="idCurrency"
					control={control}
					render={({ field }) => (
						<Select
							value={field.value}
							onValueChange={field.onChange}
							disabled={isLoading}
						>
							<SelectTrigger
								className={cn(errors.idCurrency && 'border-destructive')}
							>
								<SelectValue placeholder="Seleccione una moneda" />
							</SelectTrigger>
							<SelectContent>
								{currencies.map((currency) => (
									<SelectItem
										key={currency.idCurrency}
										value={currency.idCurrency.toString()}
									>
										{currency.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
				{errors.idCurrency && (
					<p className="text-sm text-destructive">
						{errors.idCurrency.message as string}
					</p>
				)}
			</div>

			{/* Botones de accion */}
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
