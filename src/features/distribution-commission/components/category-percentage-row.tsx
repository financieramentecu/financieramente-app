import { Trash2 } from 'lucide-react'
import type { Control, FieldPath } from 'react-hook-form'
import { useFormContext } from 'react-hook-form'
import type { Level } from '@/features/levels/types/level.types'
import type {
	CreateCommissionRuleFormData,
	UpdateCommissionRuleFormData,
} from '@/features/distribution-commission/lib/commission-rule-schemas'
import { Button } from '@/features/shared/ui/button'
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/features/shared/ui/form'
import { PercentageField } from '@/features/shared/ui/percentage-field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'

type CommissionRuleFormData =
	| CreateCommissionRuleFormData
	| UpdateCommissionRuleFormData

interface CategoryPercentageRowProps {
	index: number
	control: Control<CommissionRuleFormData>
	levels: Level[]
	selectedCategoryIds: Array<number | undefined>
	onRemove: () => void
	hasPortfolio: boolean
}

export function CategoryPercentageRow({
	index,
	control,
	levels,
	selectedCategoryIds,
	onRemove,
	hasPortfolio,
}: CategoryPercentageRowProps) {
	const { trigger } = useFormContext<CommissionRuleFormData>()
	const percentagePath =
		`categories.${index}.percentage` as FieldPath<CommissionRuleFormData>
	const portfolioPath =
		`categories.${index}.portfolioPercentage` as FieldPath<CommissionRuleFormData>

	return (
		<div className="flex flex-col gap-3 py-6 sm:flex-row sm:items-start sm:gap-5 sm:py-5">
			<FormField
				control={control}
				name={`categories.${index}.idLevel`}
				render={({ field }) => (
					<FormItem className="min-w-0 flex-1 space-y-2">
						<FormLabel className={index !== 0 ? 'sr-only' : ''}>
							Nivel (Jerarquía)
						</FormLabel>
						<Select
							onValueChange={(value) =>
								field.onChange(Number(value))
							}
							value={field.value ? String(field.value) : undefined}
						>
							<FormControl>
								<SelectTrigger className="h-9 w-full">
									<SelectValue placeholder="Seleccionar nivel" />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{levels.map((level) => (
									<SelectItem
										key={level.idLevel}
										value={String(level.idLevel)}
										disabled={selectedCategoryIds.some(
											(id, selectedIndex) =>
												selectedIndex !== index &&
												id === level.idLevel
										)}
									>
										{level.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={control}
				name={`categories.${index}.percentage`}
				render={({ field }) => (
					<FormItem className="w-full space-y-2 sm:w-44 sm:max-w-44 sm:shrink-0">
						<FormLabel className={index !== 0 ? 'sr-only' : ''}>
							Porcentaje
						</FormLabel>
						<FormControl>
							<PercentageField
								value={field.value}
								onChange={field.onChange}
								onBlur={() => {
									field.onBlur()
									queueMicrotask(() => {
										void trigger(percentagePath)
									})
								}}
								name={field.name}
								ref={field.ref}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			{hasPortfolio ? (
				<FormField
					control={control}
					name={`categories.${index}.portfolioPercentage`}
					render={({ field }) => (
						<FormItem className="w-full space-y-2 sm:w-44 sm:max-w-44 sm:shrink-0">
							<FormLabel className={index !== 0 ? 'sr-only' : ''}>
								Cartera
							</FormLabel>
							<FormControl>
								<PercentageField
									value={field.value}
									onChange={field.onChange}
									onBlur={() => {
										field.onBlur()
										queueMicrotask(() => {
											void trigger(portfolioPath)
										})
									}}
									name={field.name}
									ref={field.ref}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			) : null}

			<div className="flex justify-end sm:w-11 sm:shrink-0 sm:self-center">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-10 w-10 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
					onClick={onRemove}
					aria-label="Eliminar nivel de la distribución"
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)
}
