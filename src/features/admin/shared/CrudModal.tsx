'use client'

import React, { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/features/shared/ui/dialog'
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
import { Switch } from '@/features/shared/ui/switch'
import { cn } from '@/lib/utils'

export interface CrudModalField {
	name: string
	label: string
	type: 'text' | 'number' | 'email' | 'textarea' | 'select' | 'switch' | 'enum'
	placeholder?: string
	required?: boolean
	options?: { value: string; label: string }[]
	enumValues?: string[]
	disabled?: boolean
	description?: string
}

export interface CrudModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description?: string
	fields: CrudModalField[]
	schema: z.ZodObject<z.ZodRawShape>
	initialData?: Record<string, unknown>
	onSubmit: (data: Record<string, unknown>) => Promise<void>
	mode: 'create' | 'edit'
	isLoading?: boolean
	contentClassName?: string
}

export function CrudModal({
	open,
	onOpenChange,
	title,
	description,
	fields,
	schema,
	initialData,
	onSubmit,
	mode,
	isLoading = false,
	contentClassName,
}: CrudModalProps) {
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		reset,
		control,
	} = useForm({
		resolver: zodResolver(schema),
		defaultValues: initialData || {},
	})

	useEffect(() => {
		if (open) {
			reset(initialData || {})
		}
	}, [open, initialData, reset])

	const handleFormSubmit = async (data: Record<string, unknown>) => {
		try {
			await onSubmit(data)
			reset()
			onOpenChange(false)
		} catch (error) {
			console.error('Error submitting form:', error)
		}
	}

	const renderField = (field: CrudModalField) => {
		const error = errors[field.name]

		switch (field.type) {
			case 'textarea':
				return (
					<div key={field.name} className="space-y-2">
						<Label htmlFor={field.name}>
							{field.label}
							{field.required && (
								<span className="text-destructive ml-1">*</span>
							)}
						</Label>
						<Textarea
							id={field.name}
							{...register(field.name)}
							placeholder={field.placeholder}
							disabled={field.disabled || isLoading}
							className={cn(error && 'border-destructive')}
						/>
						{error && (
							<p className="text-sm text-destructive">
								{error.message as string}
							</p>
						)}
					</div>
				)

			case 'select':
				return (
					<div key={field.name} className="space-y-2">
						<Label htmlFor={field.name}>
							{field.label}
							{field.required && (
								<span className="text-destructive ml-1">*</span>
							)}
						</Label>
						<Controller
							name={field.name}
							control={control}
							render={({ field: controllerField }) => (
								<Select
									value={controllerField.value?.toString() ?? ''}
									onValueChange={(val) => controllerField.onChange(val)}
									disabled={field.disabled || isLoading}
								>
									<SelectTrigger className={cn(error && 'border-destructive')}>
										<SelectValue
											placeholder={field.placeholder || 'Seleccionar...'}
										/>
									</SelectTrigger>
									<SelectContent>
										{field.options?.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{error && (
							<p className="text-sm text-destructive">
								{error.message as string}
							</p>
						)}
					</div>
				)

			case 'enum':
				return (
					<div key={field.name} className="space-y-2">
						<Label htmlFor={field.name}>
							{field.label}
							{field.required && (
								<span className="text-destructive ml-1">*</span>
							)}
						</Label>
						<Controller
							name={field.name}
							control={control}
							render={({ field: controllerField }) => (
								<Select
									value={controllerField.value?.toString() ?? ''}
									onValueChange={(val) => controllerField.onChange(val)}
									disabled={field.disabled || isLoading}
								>
									<SelectTrigger className={cn(error && 'border-destructive')}>
										<SelectValue
											placeholder={field.placeholder || 'Seleccionar...'}
										/>
									</SelectTrigger>
									<SelectContent>
										{field.enumValues?.map((enumValue) => (
											<SelectItem key={enumValue} value={enumValue}>
												{enumValue}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{error && (
							<p className="text-sm text-destructive">
								{error.message as string}
							</p>
						)}
					</div>
				)

			case 'switch':
				return (
					<div key={field.name} className="space-y-2">
						<div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 shadow-sm">
							<div className="pr-4">
								<Label
									htmlFor={field.name}
									className="text-sm font-semibold text-foreground leading-tight"
								>
									{field.label}
									{field.required && (
										<span className="text-destructive ml-1">*</span>
									)}
								</Label>
								{field.description && (
									<p className="text-xs text-muted-foreground mt-1 max-w-xs">
										{field.description}
									</p>
								)}
							</div>
							<Controller
								name={field.name}
								control={control}
								render={({ field: controllerField }) => (
									<Switch
										id={field.name}
										checked={
											typeof controllerField.value === 'boolean'
												? controllerField.value
												: Boolean(initialData?.[field.name])
										}
										onCheckedChange={(checked) =>
											controllerField.onChange(checked)
										}
										disabled={field.disabled || isLoading}
										className="data-[state=checked]:shadow-[0_10px_18px_rgba(0,107,94,0.25)] data-[state=unchecked]:shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
									/>
								)}
							/>
						</div>
						{error && (
							<p className="text-sm text-destructive">
								{error.message as string}
							</p>
						)}
					</div>
				)

			default:
				return (
					<div key={field.name} className="space-y-2">
						<Label htmlFor={field.name}>
							{field.label}
							{field.required && (
								<span className="text-destructive ml-1">*</span>
							)}
						</Label>
						<Input
							id={field.name}
							type={field.type}
							{...register(field.name, {
								valueAsNumber: field.type === 'number',
							})}
							placeholder={field.placeholder}
							disabled={field.disabled || isLoading}
							className={cn(error && 'border-destructive')}
						/>
						{error && (
							<p className="text-sm text-destructive">
								{error.message as string}
							</p>
						)}
					</div>
				)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={cn("max-w-2xl max-h-[90vh] overflow-y-auto", contentClassName)}>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{fields.map((field) => (
							<div
								key={field.name}
								className={cn(
									(field.type === 'textarea' || field.type === 'switch') &&
										'md:col-span-2'
								)}
							>
								{renderField(field)}
							</div>
						))}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting || isLoading}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isSubmitting || isLoading}>
							{isSubmitting || isLoading
								? 'Guardando...'
								: mode === 'create'
									? 'Crear'
									: 'Guardar'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
