'use client'

import * as React from 'react'
import { Banknote } from 'lucide-react'
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

export interface ConfirmFondeoDialogProps {
	open: boolean
	index: number
	onConfirm: (fondeoDate: string) => void
	onCancel: () => void
}

function getTodayIso(): string {
	return new Date().toISOString().slice(0, 10)
}

export function ConfirmFondeoDialog({
	open,
	index,
	onConfirm,
	onCancel,
}: ConfirmFondeoDialogProps) {
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
						<Banknote className="h-5 w-5 text-green-600" aria-hidden />
						<DialogTitle>Confirmar fondeo del primer pago</DialogTitle>
					</div>
					<p className="text-sm text-muted-foreground pt-1">
						Aporte {index}
					</p>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
						El negocio pasará a estado FONDEADO. Esta acción no se puede deshacer.
					</p>

					<div className="space-y-1.5">
						<Label htmlFor="fondeo-date" className="text-sm font-medium">
							Fecha de fondeo
						</Label>
						<Input
							id="fondeo-date"
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
						Confirmar fondeo
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
