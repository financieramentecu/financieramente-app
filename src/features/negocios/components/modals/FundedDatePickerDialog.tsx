'use client'

import * as React from 'react'
import { CalendarCheck } from 'lucide-react'
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

export interface FundedDatePickerDialogProps {
	open: boolean
	title?: string
	subtitle?: string
	isLoading: boolean
	error?: string | null
	onConfirm: (date: string) => void
	onCancel: () => void
}

export function FundedDatePickerDialog({
	open,
	title = 'Fondear primer aporte',
	subtitle,
	isLoading,
	error,
	onConfirm,
	onCancel,
}: FundedDatePickerDialogProps) {
	const [date, setDate] = React.useState<string>('')

	// Reset date when dialog opens
	React.useEffect(() => {
		if (open) {
			// Default to today in Bogota — compute the YYYY-MM-DD via en-CA locale
			const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
			setDate(today)
		}
	}, [open])

	return (
		<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<CalendarCheck className="h-5 w-5 text-green-600" aria-hidden />
						<DialogTitle>{title}</DialogTitle>
					</div>
					{subtitle && (
						<p className="text-sm text-muted-foreground pt-1">{subtitle}</p>
					)}
				</DialogHeader>

				<div className="space-y-4 py-2">
					{error && (
						<p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
							{error}
						</p>
					)}

					<div className="space-y-1.5">
						<Label htmlFor="fund-date-input" className="text-sm font-medium">
							Fecha de fondeo
						</Label>
						<Input
							id="fund-date-input"
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							disabled={isLoading}
							className="border-green-300 focus-visible:ring-green-400"
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
						onClick={() => onConfirm(date)}
						disabled={!date || isLoading}
						className="bg-green-600 hover:bg-green-700 text-white"
					>
						{isLoading ? 'Fondeando...' : 'Confirmar fondeo'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
