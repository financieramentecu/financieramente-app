'use client'

import { useState } from 'react'
import { Columns3 } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/features/shared/ui/dialog'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ActivityColumn } from '@/features/leads/agenda/activity-column.types'
import type { AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'

const COLUMN_HINTS: Record<AgendaBucket, string> = {
	overdue: 'Actividades con la fecha ya vencida',
	today: 'Actividades que vencen hoy',
	upcoming: 'Actividades que vencen después',
	done: 'Actividades ya completadas',
}

function ColumnRow({ column, onSave }: { column: ActivityColumn; onSave: (code: AgendaBucket, name: string) => Promise<boolean> }) {
	const [name, setName] = useState(column.name)
	const dirty = name.trim() !== column.name

	return (
		<li className="space-y-1">
			<div className="flex items-center gap-2">
				<Input aria-label={`Cabecera de ${column.name}`} value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
				<Button type="button" size="sm" variant="outline" disabled={!dirty || !name.trim()} onClick={() => void onSave(column.code, name.trim())}>
					Guardar
				</Button>
			</div>
			<p className="text-xs text-muted-foreground">{COLUMN_HINTS[column.code]}</p>
		</li>
	)
}

/** Managers rename the four activities-board headers. The grouping stays by due date. */
export function ActivityColumnSettings({
	state,
	actionError,
	onSave,
}: {
	state: AsyncState<ActivityColumn[]>
	actionError: string | null
	onSave: (code: AgendaBucket, name: string) => Promise<boolean>
}) {
	const [open, setOpen] = useState(false)
	const columns = state.status === 'success' ? state.data : []

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" size="sm" variant="outline">
					<Columns3 className="size-4" aria-hidden />
					Cabeceras
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>Cabeceras del tablero</DialogTitle>
					<DialogDescription>
						Cambia el título de cada columna. Las tarjetas siguen agrupándose por la fecha de vencimiento.
					</DialogDescription>
				</DialogHeader>
				{state.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Cargando…</p>}
				{state.status === 'error' && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
				{actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
				{state.status === 'success' && (
					<ul className="space-y-3">
						{columns.map((column) => (
							<ColumnRow key={`${column.code}:${column.name}`} column={column} onSave={onSave} />
						))}
					</ul>
				)}
			</DialogContent>
		</Dialog>
	)
}
