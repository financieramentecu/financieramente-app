'use client'

import React from 'react'
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
import type { Category, CategoryType } from '../types/category.types'
import { SYSTEM_CATEGORY_TYPE_NAME } from '../types/category.types'
import { cn } from '@/lib/utils'
import { useCategoryTypes } from '@/features/category-types/hooks/use-category-types'
import { useActiveUsers } from '../hooks/use-active-users'

interface CategoryOption {
	idCategory: number
	name: string
}

interface CategoryFormProps {
	mode: 'create' | 'edit'
	initialData?: Category
	categories?: CategoryOption[]
	onSubmit: (
		data: CreateCategoryFormData | UpdateCategoryFormData
	) => Promise<void>
	onCancel?: () => void
	isLoading?: boolean
}

type FormValues = CreateCategoryFormData

export function CategoryForm({
	mode,
	initialData,
	categories = [],
	onSubmit: submitHandler,
	onCancel,
	isLoading = false,
}: CategoryFormProps) {
	const { data: typesData } = useCategoryTypes()
	const options = typesData?.categoryTypes.map(t => ({ id: t.id, label: t.name })) || []

	const { state: usersState } = useActiveUsers()
	const activeUsers = usersState.status === 'success' ? usersState.data : []

	const form = useForm<FormValues>({
		resolver: zodResolver(createCategorySchema) as Resolver<FormValues>,
		defaultValues: (initialData
			? {
				code: initialData.code,
				name: initialData.name,
				typeCategory: initialData.typeCategory as CategoryType,
				descripcion: initialData.descripcion,
				color: initialData.color ?? '#1A73E8',
				status: initialData.status,
				beneficiaryMode: initialData.beneficiaryMode ?? 'OVERRIDE',
				idFixedBeneficiaryUser: initialData.idFixedBeneficiaryUser ?? null,
				idNextCategory: initialData.idNextCategory ?? null,
			}
			: {
				code: '',
				name: '',
				typeCategory: 'MMS' as CategoryType,
				descripcion: '',
				color: '#1A73E8',
				status: true,
				beneficiaryMode: 'OVERRIDE' as const,
				idFixedBeneficiaryUser: null,
				idNextCategory: null,
			}) as DefaultValues<FormValues>,
	})

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		control,
		watch,
		setValue,
	} = form

	const beneficiaryMode = watch('beneficiaryMode')
	const isSystemCategory = initialData?.typeCategory === SYSTEM_CATEGORY_TYPE_NAME

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
								{options.map((type) => (
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

			{/* Color Field */}
			<div className="space-y-2">
				<Label htmlFor="color">
					Color <span className="text-destructive">*</span>
				</Label>
				<div className="flex items-center gap-3">
					<input
						id="color"
						type="color"
						disabled={isFormDisabled}
						className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1 disabled:cursor-not-allowed disabled:opacity-50"
						{...register('color')}
					/>
					{errors.color && (
						<p className="text-sm text-destructive">{errors.color.message}</p>
					)}
				</div>
			</div>

			{/* Next Category Field */}
			{categories.length > 0 && (
				<div className="space-y-2">
					<Label htmlFor="idNextCategory">Siguiente categoría</Label>
					<Controller
						name="idNextCategory"
						control={control}
						render={({ field }) => (
							<Select
								onValueChange={(val) => field.onChange(val === 'none' ? null : Number(val))}
								value={field.value != null ? String(field.value) : 'none'}
								disabled={isFormDisabled}
							>
								<SelectTrigger
									className={cn(errors.idNextCategory && 'border-destructive')}
								>
									<SelectValue placeholder="Seleccione la siguiente categoría (opcional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Sin siguiente categoría</SelectItem>
									{categories
										.filter((c) => c.idCategory !== initialData?.idCategory)
										.map((cat) => (
											<SelectItem key={cat.idCategory} value={String(cat.idCategory)}>
												{cat.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						)}
					/>
					{errors.idNextCategory && (
						<p className="text-sm text-destructive">
							{errors.idNextCategory.message}
						</p>
					)}
				</div>
			)}

			{/* Beneficiary Mode Field */}
			<div className="space-y-2">
				<Label htmlFor="beneficiaryMode">
					Modo de beneficiario <span className="text-destructive">*</span>
				</Label>
				<Controller
					name="beneficiaryMode"
					control={control}
					render={({ field }) => (
						<Select
							onValueChange={(val) => {
								field.onChange(val)
								if (val === 'OVERRIDE') {
									setValue('idFixedBeneficiaryUser', null)
								}
							}}
							defaultValue={field.value}
							value={field.value}
							disabled={isFormDisabled || isSystemCategory}
						>
							<SelectTrigger
								aria-label="Modo de beneficiario"
								className={cn(errors.beneficiaryMode && 'border-destructive')}
							>
								<SelectValue placeholder="Seleccione un modo" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="OVERRIDE">Override (por cadena)</SelectItem>
								<SelectItem value="BENEFICIARIO_GENERAL">Beneficiario general</SelectItem>
							</SelectContent>
						</Select>
					)}
				/>
				{errors.beneficiaryMode && (
					<p className="text-sm text-destructive">
						{errors.beneficiaryMode.message}
					</p>
				)}
			</div>

			{/* Fixed Beneficiary User Field — only when BENEFICIARIO_GENERAL */}
			{beneficiaryMode === 'BENEFICIARIO_GENERAL' && (
				<div className="space-y-2">
					<Label htmlFor="idFixedBeneficiaryUser">
						Usuario beneficiario fijo <span className="text-destructive">*</span>
					</Label>
					{isSystemCategory && initialData?.fixedBeneficiaryUser ? (
						/* Read-only display for system categories with a configured user */
						<div
							data-testid="system-user-readonly"
							className="rounded-md border bg-muted/50 p-3 space-y-1"
						>
							<p className="text-sm font-medium">
								{initialData.fixedBeneficiaryUser.name}{' '}
								{initialData.fixedBeneficiaryUser.lastName}
							</p>
							<p className="text-sm text-muted-foreground">
								{initialData.fixedBeneficiaryUser.email}
							</p>
						</div>
					) : isSystemCategory && !initialData?.fixedBeneficiaryUser ? (
						/* Read-only placeholder for system categories without configured user */
						<div
							data-testid="system-user-empty"
							className="rounded-md border border-dashed bg-muted/50 p-3"
						>
							<p className="text-sm text-muted-foreground">
								No hay usuario beneficiario fijo configurado para esta categoría de sistema.
							</p>
						</div>
					) : (
						/* Select de usuarios activos */
						<>
							<Controller
								name="idFixedBeneficiaryUser"
								control={control}
								render={({ field }) => (
									<Select
										onValueChange={(val) => field.onChange(Number(val))}
										value={field.value != null ? String(field.value) : ''}
										disabled={isFormDisabled || usersState.status === 'loading'}
									>
										<SelectTrigger
											className={cn(errors.idFixedBeneficiaryUser && 'border-destructive')}
										>
											<SelectValue
												placeholder={
													usersState.status === 'loading'
														? 'Cargando usuarios...'
														: 'Seleccione un usuario'
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{activeUsers.map((user) => (
												<SelectItem key={user.id} value={String(user.id)}>
													{user.name} {user.lastName} — {user.email}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.idFixedBeneficiaryUser && (
								<p className="text-sm text-destructive">
									{errors.idFixedBeneficiaryUser.message}
								</p>
							)}
						</>
					)}
				</div>
			)}

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
