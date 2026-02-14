'use client'

import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	createCommissionRuleSchema,
	updateCommissionRuleSchema,
	CreateCommissionRuleFormData,
	UpdateCommissionRuleFormData,
} from '@/features/commission-rules/lib/commission-rule-schemas'
import { Button } from '@/features/shared/ui/button'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormDescription,
} from '@/features/shared/ui/form'
import { Input } from '@/features/shared/ui/input'
import { Switch } from '@/features/shared/ui/switch'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { CommissionRule } from '@/features/commission-rules/types/commission-rule.types'
import { useCommissionRuleMutations } from '@/features/commission-rules/hooks/use-commission-rule-mutations'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

// Unified form type for internal use
type CommissionRuleFormData =
	| CreateCommissionRuleFormData
	| UpdateCommissionRuleFormData

interface CommissionRuleFormProps {
	productConfigId: number
	initialData?: CommissionRule
	mode: 'create' | 'edit'
}

export function CommissionRuleForm({
	productConfigId,
	initialData,
	mode,
}: CommissionRuleFormProps) {
	const router = useRouter()
	const { create, update, isCreating, isUpdating } = useCommissionRuleMutations(
		productConfigId
	)
	
	// Fetch categories for selection
	const { state: categoriesState } = useCategories({
		status: 'true', // Only active categories
		pageSize: 100, // Fetch enough categories
	})

	const isLoading = isCreating || isUpdating

	// Initialize form
	const form = useForm<CommissionRuleFormData>({
		resolver: zodResolver(
			mode === 'create'
				? createCommissionRuleSchema
				: updateCommissionRuleSchema
		),
		defaultValues:
			mode === 'create'
				? {
						idProductConfiguration: productConfigId,
						description: '',
						categories: [],
				  }
				: {
						idProductPercentageCommission: initialData?.id,
						description: initialData?.description || '',
						active: initialData?.active,
						categories: initialData?.categories?.map((cat) => ({
							idCategory: cat.idCategory,
							percentage: Number(cat.porcentajeDistribucion),
						})) || [],
				  },
	})

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: 'categories',
	})

	const watchedCategories = useWatch({
		control: form.control,
		name: 'categories',
	})

	const totalPercentage = useMemo(() => {
		return (watchedCategories || []).reduce(
			(acc, item) => acc + (Number(item?.percentage) || 0),
			0
		)
	}, [watchedCategories])

	const onSubmit = async (data: CommissionRuleFormData) => {
		// Manual validation check for total percentage in case schema check is bypassed (unlikely but safe)
		if (Math.abs(totalPercentage - 100) >= 0.01) {
			form.setError('categories', {
				type: 'manual',
				message: 'La suma de los porcentajes debe ser exactamente 100%',
			})
			return
		}

		try {
			let success = false
			if (mode === 'create') {
				const createData = data as CreateCommissionRuleFormData
				success = await create({
					description: createData.description,
					categories: createData.categories,
				})
			} else {
				const updateData = data as UpdateCommissionRuleFormData
				if (!initialData) return
				success = await update(initialData.id, {
					description: updateData.description,
					active: updateData.active,
					categories: updateData.categories,
				})
			}

			if (success) {
				toast.success(
					mode === 'create'
						? 'Regla creada'
						: 'Regla actualizada',
					{
						description: `La regla ha sido ${
							mode === 'create' ? 'creada' : 'actualizada'
						} exitosamente.`,
					}
				)
				router.push(
					`/dashboard/configuraciones-producto/${productConfigId}/reglas`
				)
			} else {
				toast.error('Error', {
					description: `No se pudo ${
						mode === 'create' ? 'crear' : 'actualizar'
					} la regla.`,
				})
			}
		} catch (error) {
			console.error('Form submission error:', error)
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
				<div className="grid gap-6 md:grid-cols-2">
					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Descripción</FormLabel>
								<FormControl>
									<Input
										placeholder="Ej: Distribución Estándar 2024"
										{...field}
										value={field.value as string}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{mode === 'edit' && (
						<FormField
							control={form.control}
							name="active"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">
											Activo
										</FormLabel>
										<FormDescription>
											Activar o desactivar esta regla de comisión.
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value as boolean}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
					)}
				</div>

				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-lg font-medium">Categorías</h3>
							<p className="text-sm text-muted-foreground">
								Distribución de porcentajes por categoría.
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => append({ idCategory: 0, percentage: 0 })}
						>
							<Plus className="mr-2 h-4 w-4" />
							Agregar Categoría
						</Button>
					</div>

					<div className="rounded-md border p-4">
						<div className="space-y-4">
							{fields.map((field, index) => (
								<div
									key={field.id}
									className="flex items-end gap-4"
								>
									<FormField
										control={form.control}
										name={`categories.${index}.idCategory`}
										render={({ field }) => (
											<FormItem className="flex-1">
												<FormLabel className={index !== 0 ? "sr-only" : ""}>Categoría</FormLabel>
												<Select
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
													value={field.value ? String(field.value) : undefined}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Seleccionar categoría" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{/* Show currently selected option if finding category name */}
														{categoriesState.data?.categories.map(
															(category) => (
																<SelectItem
																	key={category.idCategory}
																	value={String(category.idCategory)}
																	disabled={
																		// If already selected in another row, disable using availableCategories logic, 
																		// unless it's the current row's value
																		(watchedCategories || []).some(
																			(w, i) => i !== index && String(w?.idCategory) === String(category.idCategory)
																		)
																	}
																>
																	{category.name} ({category.code})
																</SelectItem>
															)
														)}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name={`categories.${index}.percentage`}
										render={({ field }) => (
											<FormItem className="w-[150px]">
												<FormLabel className={index !== 0 ? "sr-only" : ""}>Porcentaje (%)</FormLabel>
												<FormControl>
													<Input
														type="number"
														step="0.01"
														min="0"
														max="100"
														placeholder="0.00"
														{...field}
														onChange={(e) => field.onChange(parseFloat(e.target.value))}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-10 w-10 shrink-0 text-destructive"
										onClick={() => remove(index)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>

						{fields.length === 0 && (
							<div className="py-6 text-center text-sm text-muted-foreground">
								No hay categorías agregadas. Agrega una para comenzar la distribución.
							</div>
						)}
					</div>

					<div className="flex items-center justify-end gap-4">
						<div className="text-right">
							<p className="text-sm font-medium">Total</p>
							<p
								className={cn(
									"text-2xl font-bold",
									Math.abs(totalPercentage - 100) < 0.01
										? "text-green-600"
										: "text-destructive"
								)}
							>
								{totalPercentage.toFixed(2)}%
							</p>
						</div>
					</div>
					{form.formState.errors.categories?.root && (
						<p className="text-right text-sm font-medium text-destructive">
							{form.formState.errors.categories.root.message}
						</p>
					)}
					{/* Also show generic array error if coming from refine */}
					{typeof form.formState.errors.categories?.message === 'string' && (
						<p className="text-right text-sm font-medium text-destructive">
							{form.formState.errors.categories.message}
						</p>
					)}
				</div>

				<div className="flex justify-end space-x-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.back()}
						disabled={isLoading}
					>
						Cancelar
					</Button>
					<Button 
						type="submit" 
						disabled={isLoading || Math.abs(totalPercentage - 100) >= 0.01}
					>
						{isLoading && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						{mode === 'create' ? 'Crear Regla' : 'Guardar Cambios'}
					</Button>
				</div>
			</form>
		</Form>
	)
}
