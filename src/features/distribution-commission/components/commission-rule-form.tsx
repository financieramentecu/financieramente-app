'use client'

import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	createCommissionRuleSchema,
	updateCommissionRuleSchema,
	CreateCommissionRuleFormData,
	UpdateCommissionRuleFormData,
} from '@/features/distribution-commission/lib/commission-rule-schemas'
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
import { CommissionRule } from '@/features/distribution-commission/types/commission-rule.types'
import { useCommissionRuleMutations } from '@/features/distribution-commission/hooks/use-commission-rule-mutations'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CategoryPercentageRow } from '@/features/distribution-commission/components/category-percentage-row'
import { useState } from 'react'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/features/shared/ui/alert-dialog'

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
	const { create, update, isCreating, isUpdating } =
		useCommissionRuleMutations(productConfigId)
	const [showImpactDialog, setShowImpactDialog] = useState(false)
	const [pendingData, setPendingData] = useState<CommissionRuleFormData | null>(
		null
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
		) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
						categories:
							initialData?.categories?.map((cat) => ({
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
	const selectedCategoryIds = (watchedCategories || []).map(
		(item) => item?.idCategory
	)

	const totalPercentage = (watchedCategories || []).reduce(
		(acc, item) => acc + (Number(item?.percentage) || 0),
		0
	)

	const submitData = async (data: CommissionRuleFormData) => {
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
						? 'Distribución creada'
						: 'Distribución actualizada',
					{
						description: `La distribución ha sido ${
							mode === 'create' ? 'creada' : 'actualizada'
						} exitosamente.`,
					}
				)
				router.push(
					`/dashboard/distribucion-comisiones/${productConfigId}/reglas`
				)
			} else {
				toast.error('Error', {
					description: `No se pudo ${
						mode === 'create' ? 'crear' : 'actualizar'
					} la distribución.`,
				})
			}
		} catch (error) {
			console.error('Form submission error:', error)
		}
	}

	const onSubmit = async (data: CommissionRuleFormData) => {
		if (mode === 'edit') {
			setPendingData(data)
			setShowImpactDialog(true)
			return
		}

		await submitData(data)
	}

	const handleConfirmImpact = async () => {
		if (!pendingData) return
		setShowImpactDialog(false)
		await submitData(pendingData)
		setPendingData(null)
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
										value={(field.value as string | undefined) ?? ''}
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
										<FormLabel className="text-base">Activo</FormLabel>
										<FormDescription>
											Activar o desactivar esta distribución de comisión.
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
							onClick={() => append({ idCategory: 0, percentage: 0.01 })}
						>
							<Plus className="mr-2 h-4 w-4" />
							Agregar Categoría
						</Button>
					</div>

					<div className="rounded-md border p-4">
						<div className="space-y-4">
							{fields.map((field, index) => (
								<CategoryPercentageRow
									key={field.id}
									index={index}
									control={form.control}
									categories={categoriesState.data?.categories ?? []}
									selectedCategoryIds={selectedCategoryIds}
									onRemove={() => remove(index)}
								/>
							))}
						</div>

						{fields.length === 0 && (
							<div className="py-6 text-center text-sm text-muted-foreground">
								No hay categorías agregadas. Agrega una para comenzar la
								distribución.
							</div>
						)}
					</div>

					<div className="flex items-center justify-end gap-4">
						<div className="text-right">
							<p className="text-sm font-medium">Total (informativo)</p>
							<p
								className={cn(
									'text-2xl font-bold',
									totalPercentage > 0
										? 'text-foreground'
										: 'text-muted-foreground'
								)}
							>
								{totalPercentage.toFixed(4)}%
							</p>
						</div>
					</div>
				</div>

				<AlertDialog
					open={showImpactDialog}
					onOpenChange={(open) => {
						setShowImpactDialog(open)
						if (!open) {
							setPendingData(null)
						}
					}}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Confirmar actualización</AlertDialogTitle>
							<AlertDialogDescription>
								Los cambios en esta distribución pueden afectar negocios
								asociados y futuras liquidaciones. ¿Deseas continuar?
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancelar</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleConfirmImpact}
								disabled={isLoading}
							>
								Confirmar cambios
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<div className="flex justify-end space-x-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.back()}
						disabled={isLoading}
					>
						Cancelar
					</Button>
					<Button type="submit" disabled={isLoading}>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{mode === 'create' ? 'Crear Distribución' : 'Guardar Cambios'}
					</Button>
				</div>
			</form>
		</Form>
	)
}
