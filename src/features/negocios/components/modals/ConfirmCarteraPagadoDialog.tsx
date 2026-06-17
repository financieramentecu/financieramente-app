'use client'

import * as React from 'react'
import { CheckCircle2 } from 'lucide-react'
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
import { bogotaDateOnly } from '../../lib/bogota-date'

export interface ConfirmCarteraPagadoDialogProps {
	open: boolean
	index: number
	onConfirm: (paymentDate: string) => void
	onCancel: () => void
}

function getTodayIso(): string {
	return bogotaDateOnly(new Date())
}

export function ConfirmCarteraPagadoDialog({
	open,
	index,
	onConfirm,
	onCancel,
}: ConfirmCarteraPagadoDialogProps) {
	const [date, setDate] = React.useState<string>(getTodayIso)

	React.useEffect(() => {
		if (open) {
			setDate(getTodayIso())
		}
	}, [open])

	const handleConfirm = () => {
		onConfirm(date)
	}

	return (
		<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden />
						<DialogTitle>Confirmar pago de cartera</DialogTitle>
					</div>
					<p className="text-sm text-muted-foreground pt-1">
						Aporte {index}
					</p>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
						La cartera cambiará a pagado, ya no se va poder registrarlo como cartera.
					</p>

					<div className="space-y-1.5">
						<Label htmlFor="cartera-payment-date" className="text-sm font-medium">
							Fecha de pago
						</Label>
						<Input
							id="cartera-payment-date"
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							className="border-green-300 focus-visible:ring-green-400"
						/>
					</div>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancelar
					</Button>
					<Button
						type="button"
						onClick={handleConfirm}
						disabled={!date}
						className="bg-green-600 hover:bg-green-700 text-white"
					>
						Confirmar pago
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
