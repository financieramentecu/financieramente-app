'use client'

import * as React from 'react'
import { CalendarDays } from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/features/shared/ui/dialog'
import { Button } from '@/features/shared/ui/button'
import { Label } from '@/features/shared/ui/label'
import { Input } from '@/features/shared/ui/input'
import { useUpdateFundedDate } from '../../hooks/use-update-funded-date'
import type { PaymentInstallmentDto } from '../../types/business-api.types'

export interface EditFundedDateModalProps {
	open: boolean
	businessId: number
	index: number
	onSuccess: (payment: PaymentInstallmentDto) => void
	onCancel: () => void
}

function getTodayIso(): string {
	return new Date().toISOString().slice(0, 10)
}

export function EditFundedDateModal({
	open,
	businessId,
	index,
	onSuccess,
	onCancel,
}: EditFundedDateModalProps) {
	const [date, setDate] = React.useState<string>(getTodayIso)
	const { state, updateFundedDate } = useUpdateFundedDate(businessId, index)

	React.useEffect(() => {
		if (open) {
			setDate(getTodayIso())
		}
	}, [open])

	const handleConfirm = async () => {
		const result = await updateFundedDate(date)
		if (result.data) {
			onSuccess(result.data)
		}
	}

	const isLoading = state.status === 'loading'
	const errorMessage = state.status === 'error' ? state.error : null

	return (
		<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<CalendarDays className="h-5 w-5 text-indigo-600" aria-hidden />
						<DialogTitle>Editar fecha de fondeo</DialogTitle>
					</div>
					<p className="text-sm text-muted-foreground pt-1">
						Aporte {index}
					</p>
				</DialogHeader>

				<div className="space-y-4 py-2">
					{errorMessage && (
						<p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
							{errorMessage}
						</p>
					)}

					<div className="space-y-1.5">
						<Label htmlFor="funded-date-input" className="text-sm font-medium">
							Fecha de fondeo
						</Label>
						<Input
							id="funded-date-input"
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							disabled={isLoading}
							className="border-indigo-300 focus-visible:ring-indigo-400"
						/>
					</div>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isLoading}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						onClick={handleConfirm}
						disabled={!date || isLoading}
						className="bg-indigo-600 hover:bg-indigo-700 text-white"
					>
						{isLoading ? 'Guardando...' : 'Confirmar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
