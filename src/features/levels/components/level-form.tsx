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
	createLevelSchema,
	type CreateLevelFormData,
	type UpdateLevelFormData,
} from '../lib/level-schemas'
import type { Level, LevelType } from '../types/level.types'
import { SYSTEM_LEVEL_TYPE_NAME } from '../types/level.types'
import { cn } from '@/lib/utils'
import { useActiveCategoryTypes } from '@/features/category-types/hooks/use-active-category-types'
import { useActiveUsers } from '../hooks/use-active-users'

interface LevelOption {
	idLevel: number
	name: string
}

interface LevelFormProps {
	mode: 'create' | 'edit'
	initialData?: Level
	levels?: LevelOption[]
	onSubmit: (
		data: CreateLevelFormData | UpdateLevelFormData
	) => Promise<void>
	onCancel?: () => void
	isLoading?: boolean
}

type FormValues = CreateLevelFormData

export function LevelForm({
	mode,
	initialData,
	levels = [],
	onSubmit: submitHandler,
	onCancel,
	isLoading = false,
}: LevelFormProps) {
	const { state: typesState } = useActiveCategoryTypes()
	const activeLevelTypes = typesState.status === 'success' ? typesState.data : []
	const options = activeLevelTypes.map(t => ({ id: t.id, label: t.name }))

	if (mode === 'edit' && initialData?.typeLevel) {
		const typeName = String(initialData.typeLevel)
		if (!options.some(opt => opt.label === typeName)) {
			options.push({ id: -1, label: typeName })
		}
	}

	const { state: usersState } = useActiveUsers()
	const activeUsers = usersState.status === 'success' ? usersState.data : []

	const form = useForm<FormValues>({
		resolver: zodResolver(createLevelSchema) as Resolver<FormValues>,
		defaultValues: (initialData
			? {
				code: initialData.code,
				name: initialData.name,
				typeLevel: initialData.typeLevel as LevelType,
				descripcion: initialData.descripcion,
				color: initialData.color ?? '#1A73E8',
				status: initialData.status,
				beneficiaryMode: initialData.beneficiaryMode ?? 'OVERRIDE',
				idFixedBeneficiaryUser: initialData.idFixedBeneficiaryUser ?? null,
				idNextLevel: initialData.idNextLevel ?? null,
			}
			: {
				code: '',
				name: '',
				typeLevel: 'MMS' as LevelType,
				descripcion: '',
				color: '#1A73E8',
				status: true,
				beneficiaryMode: 'OVERRIDE' as const,
				idFixedBeneficiaryUser: null,
				idNextLevel: null,
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
	const isSystemLevel = initialData?.typeLevel === SYSTEM_LEVEL_TYPE_NAME

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
					placeholder="Ingrese el código del nivel"
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
					Nombre del Nivel <span className="text-destructive">*</span>
				</Label>
				<Input
					id="name"
					placeholder="Ingrese el nombre del nivel"
					disabled={isFormDisabled}
					className={cn(errors.name && 'border-destructive')}
					{...register('name')}
				/>
				{errors.name && (
					<p className="text-sm text-destructive">{errors.name.message}</p>
				)}
			</div>

			{/* Type Level Field */}
			<div className="space-y-2">
				<Label htmlFor="typeLevel">
					Tipo de Nivel <span className="text-destructive">*</span>
				</Label>
				<Controller
					name="typeLevel"
					control={control}
					render={({ field }) => (
						<Select
							onValueChange={field.onChange}
							defaultValue={field.value}
							disabled={isFormDisabled}
							value={field.value}
						>
							<SelectTrigger
								className={cn(errors.typeLevel && 'border-destructive')}
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
				{errors.typeLevel && (
					<p className="text-sm text-destructive">
						{errors.typeLevel.message}
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

			{/* Next Level Field */}
			{levels.length > 0 && (
				<div className="space-y-2">
					<Label htmlFor="idNextLevel">Siguiente nivel</Label>
					<Controller
						name="idNextLevel"
						control={control}
						render={({ field }) => (
							<Select
								onValueChange={(val) => field.onChange(val === 'none' ? null : Number(val))}
								value={field.value != null ? String(field.value) : 'none'}
								disabled={isFormDisabled}
							>
								<SelectTrigger
									className={cn(errors.idNextLevel && 'border-destructive')}
								>
									<SelectValue placeholder="Seleccione el siguiente nivel (opcional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Sin siguiente nivel</SelectItem>
									{levels
										.filter((l) => l.idLevel !== initialData?.idLevel)
										.map((lvl) => (
											<SelectItem key={lvl.idLevel} value={String(lvl.idLevel)}>
												{lvl.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						)}
					/>
					{errors.idNextLevel && (
						<p className="text-sm text-destructive">
							{errors.idNextLevel.message}
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
							disabled={isFormDisabled || isSystemLevel}
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
					{isSystemLevel && initialData?.fixedBeneficiaryUser ? (
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
					) : isSystemLevel && !initialData?.fixedBeneficiaryUser ? (
						<div
							data-testid="system-user-empty"
							className="rounded-md border border-dashed bg-muted/50 p-3"
						>
							<p className="text-sm text-muted-foreground">
								No hay usuario beneficiario fijo configurado para este nivel de sistema.
							</p>
						</div>
					) : (
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
							? 'Crear Nivel (Jerarquía)'
							: 'Guardar Cambios'}
				</Button>
			</div>
		</form>
	)
}
