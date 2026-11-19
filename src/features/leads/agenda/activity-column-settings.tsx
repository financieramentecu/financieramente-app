'use client'

import { useState, type FormEvent } from 'react'
import { Columns3, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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

async function saveColumn(code: string, name: string, onSave: (code: string, name: string) => Promise<boolean>) {
	if (await onSave(code, name)) toast.success('Columna actualizada', { description: `El estado ahora es ${name}.` })
}

async function removeColumn(code: string, onRemove: (code: string) => Promise<boolean>) {
	if (await onRemove(code)) toast.success('Columna eliminada')
}

function columnHint(column: ActivityColumn): string {
	if (column.system && column.code in COLUMN_HINTS) return COLUMN_HINTS[column.code as AgendaBucket]
	return 'Suelta aquí las tarjetas. La fecha de vencimiento no cambia.'
}

function ColumnRow({
	column,
	onSave,
	onRemove,
}: {
	column: ActivityColumn
	onSave: (code: string, name: string) => Promise<boolean>
	onRemove: (code: string) => Promise<boolean>
}) {
	const [name, setName] = useState(column.name)
	const dirty = name.trim() !== column.name

	return (
		<li className="space-y-1">
			<div className="flex items-center gap-2">
				<Input aria-label={`Columna ${column.name}`} value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={!dirty || !name.trim()}
					onClick={() => void saveColumn(column.code, name.trim(), onSave)}
				>
					Guardar
				</Button>
				<Button type="button" size="sm" variant="ghost" aria-label={`Eliminar columna ${column.name}`} onClick={() => void removeColumn(column.code, onRemove)}>
					<Trash2 className="size-3.5" aria-hidden />
				</Button>
			</div>
			<p className="text-xs text-muted-foreground">{columnHint(column)}</p>
		</li>
	)
}

/** Managers add, rename and hide the activities-board columns. */
export function ActivityColumnSettings({
	state,
	actionError,
	onSave,
	onAdd,
	onRemove,
}: {
	state: AsyncState<ActivityColumn[]>
	actionError: string | null
	onSave: (code: string, name: string) => Promise<boolean>
	onAdd: (name: string) => Promise<boolean>
	onRemove: (code: string) => Promise<boolean>
}) {
	const [open, setOpen] = useState(false)
	const [name, setName] = useState('')
	const columns = state.status === 'success' ? state.data : []

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const next = name.trim()
		if (next && (await onAdd(next))) {
			setName('')
			toast.success('Columna agregada', { description: `${next} ya es un estado del tablero.` })
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" size="sm" variant="outline">
					<Columns3 className="size-4" aria-hidden />
					Columnas
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>Columnas del tablero</DialogTitle>
					<DialogDescription>
						El nombre de cada columna es el estado de la tarea o del caso. Ese mismo estado se ve en el pipeline. Las de vencimiento agrupan por la fecha; una columna nueva queda vacía hasta que sueltes una tarjeta. Eliminar no borra las actividades: si quitas una de vencimiento, créala otra vez con el mismo nombre para volver a verla.
					</DialogDescription>
				</DialogHeader>
				{state.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Cargando…</p>}
				{state.status === 'error' && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
				{actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
				{state.status === 'success' && (
					<div className="space-y-4">
						<ul className="space-y-3">
							{columns.map((column) => (
								<ColumnRow key={`${column.code}:${column.name}`} column={column} onSave={onSave} onRemove={onRemove} />
							))}
						</ul>
						<form onSubmit={submit} className="flex items-center gap-2">
							<Input aria-label="Nueva columna" placeholder="Nueva columna" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
							<Button type="submit" size="sm" disabled={!name.trim()}>
								Agregar
							</Button>
						</form>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
