import { Trash2 } from 'lucide-react'
import type { Control } from 'react-hook-form'
import type { Category } from '@/features/categories/types/category.types'
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
import { Input } from '@/features/shared/ui/input'
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
	categories: Category[]
	selectedCategoryIds: Array<number | undefined>
	onRemove: () => void
}

export function CategoryPercentageRow({
	index,
	control,
	categories,
	selectedCategoryIds,
	onRemove,
}: CategoryPercentageRowProps) {
	return (
		<div className="flex items-start gap-4">
			<FormField
				control={control}
				name={`categories.${index}.idCategory`}
				render={({ field }) => (
					<FormItem className="flex-1">
						<FormLabel className={index !== 0 ? 'sr-only' : ''}>
							Categoría
						</FormLabel>
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
								{categories.map((category) => (
									<SelectItem
										key={category.idCategory}
										value={String(category.idCategory)}
										disabled={selectedCategoryIds.some(
											(id, selectedIndex) =>
												selectedIndex !== index &&
												id === category.idCategory
										)}
									>
										{category.name} ({category.code})
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
					<FormItem className="w-[150px]">
						<FormLabel className={index !== 0 ? 'sr-only' : ''}>
							Porcentaje (%)
						</FormLabel>
						<FormControl>
							<Input
								type="number"
								step="0.0001"
								min="0"
								max="100"
								placeholder="0.0000"
								value={field.value ?? ''}
								onChange={(event) => {
									const nextValue =
										event.target.value === ''
											? 0
											: Number(event.target.value)
									field.onChange(nextValue)
								}}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<div className="flex flex-col">
				{index === 0 && <div className="h-[20px] mb-2" aria-hidden="true" />}
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-10 w-10 shrink-0 text-destructive"
					onClick={onRemove}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)
}
