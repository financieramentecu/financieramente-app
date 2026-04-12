'use client'

import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	COMMISSION_RULE_CATEGORIES_SUM_MAX_MESSAGE,
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
} from '@/features/shared/ui/form'
import { Input } from '@/features/shared/ui/input'
import { CommissionRule } from '@/features/distribution-commission/types/commission-rule.types'
import { useCommissionRuleMutations } from '@/features/distribution-commission/hooks/use-commission-rule-mutations'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CategoryPercentageRow } from '@/features/distribution-commission/components/category-percentage-row'
import { formatPercentDisplay } from '@/features/shared/lib/format-percent'
import { getAppLocale } from '@/features/shared/lib/app-locale'
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

	const sumExceeds100 = totalPercentage > 100 + 1e-6

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
					active: initialData.active,
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

	const handleInvalidSubmit = () => {
		const total = (form.getValues('categories') || []).reduce(
			(acc, item) => acc + (Number(item?.percentage) || 0),
			0
		)
		if (total > 100 + 1e-6) {
			toast.error('Suma de porcentajes', {
				description: COMMISSION_RULE_CATEGORIES_SUM_MAX_MESSAGE,
			})
		}
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit, handleInvalidSubmit)}
				className="space-y-6"
			>
				<div className="max-w-2xl">
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
				</div>

				<div className="space-y-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0 space-y-1">
							<h3 className="text-lg font-semibold tracking-tight text-foreground">
								Categorías
							</h3>
							<p className="text-sm text-muted-foreground">
								Distribución de porcentajes por categoría.
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="shrink-0 self-start sm:self-auto"
							onClick={() => append({ idCategory: 0, percentage: 1 })}
						>
							<Plus className="mr-2 h-4 w-4" />
							Agregar Categoría
						</Button>
					</div>

					<div className="overflow-hidden rounded-xl border border-border/90 bg-card shadow-sm">
						{fields.length > 0 ? (
							<div className="divide-y divide-border px-4 sm:px-5">
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
						) : (
							<div className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-5">
								No hay categorías agregadas. Agrega una para comenzar la
								distribución.
							</div>
						)}

						<div className="border-t border-border bg-muted/15 px-4 py-4 sm:px-5 sm:py-4">
							<div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-end sm:gap-4">
								<p className="text-sm font-medium text-muted-foreground sm:text-right">
									Total (informativo)
								</p>
								<p
									className={cn(
										'text-lg font-semibold tabular-nums tracking-tight sm:text-xl',
										sumExceeds100
											? 'text-destructive'
											: totalPercentage > 0
												? 'text-foreground'
												: 'text-muted-foreground'
									)}
								>
									{formatPercentDisplay(totalPercentage, getAppLocale())}
								</p>
							</div>
							{sumExceeds100 && (
								<div
									role="alert"
									className="mt-3 flex items-start gap-1.5 text-sm font-medium text-destructive"
								>
									<AlertCircle
										className="mt-0.5 size-3.5 shrink-0"
										aria-hidden
									/>
									<span>{COMMISSION_RULE_CATEGORIES_SUM_MAX_MESSAGE}</span>
								</div>
							)}
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

				<div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end sm:gap-3">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.back()}
						disabled={isLoading}
						className="w-full sm:w-auto"
					>
						Cancelar
					</Button>
					<Button
						type="submit"
						disabled={isLoading}
						className="w-full sm:w-auto"
					>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{mode === 'create' ? 'Crear Distribución' : 'Guardar Cambios'}
					</Button>
				</div>
			</form>
		</Form>
	)
}
