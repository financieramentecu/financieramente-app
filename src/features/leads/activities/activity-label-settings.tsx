'use client'

import { useState, type FormEvent } from 'react'
import { Settings2, Trash2 } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/features/shared/ui/dialog'
import { DEFAULT_ACTIVITY_LABEL_COLOR, type ActivityLabel } from '@/features/leads/activities/activity-label.types'
import { useActivityLabels } from '@/features/leads/activities/use-activity-labels'

function LabelRow({
	label,
	onSave,
	onRemove,
}: {
	label: ActivityLabel
	onSave: (id: number, name: string, color: string) => Promise<boolean>
	onRemove: (id: number) => Promise<boolean>
}) {
	const [name, setName] = useState(label.name)
	const [color, setColor] = useState(label.color)
	const dirty = name.trim() !== label.name || color !== label.color

	return (
		<li className="flex items-center gap-2">
			<input
				aria-label={`Color de ${label.name}`}
				type="color"
				value={color}
				onChange={(event) => setColor(event.target.value)}
				className="h-9 w-10 shrink-0 rounded border"
			/>
			<Input aria-label={`Nombre de ${label.name}`} value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
			<Button type="button" size="sm" variant="outline" disabled={!dirty || !name.trim()} onClick={() => void onSave(label.idLeadActivityLabel, name.trim(), color)}>
				Guardar
			</Button>
			<Button type="button" size="sm" variant="ghost" aria-label={`Eliminar etiqueta ${label.name}`} onClick={() => void onRemove(label.idLeadActivityLabel)}>
				<Trash2 className="size-3.5" aria-hidden />
			</Button>
		</li>
	)
}

/** Managers rename, recolor and add the labels shown on activity cards. */
export function ActivityLabelSettings() {
	const [open, setOpen] = useState(false)
	const [name, setName] = useState('')
	const [color, setColor] = useState(DEFAULT_ACTIVITY_LABEL_COLOR)
	const labels = useActivityLabels(open)
	const catalogue = labels.state.status === 'success' ? labels.state.data : []

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (name.trim() && (await labels.addLabel(name.trim(), color))) setName('')
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" size="sm" variant="outline">
					<Settings2 className="size-4" aria-hidden />
					Etiquetas
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>Etiquetas de actividad</DialogTitle>
					<DialogDescription>
						Estos nombres salen en la tarjeta. El vencimiento sigue viéndose ahí, con la fecha y la hora.
					</DialogDescription>
				</DialogHeader>
				{labels.state.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Cargando…</p>}
				{labels.state.status === 'error' && <p role="alert" className="text-sm text-destructive">{labels.state.error}</p>}
				{labels.state.status === 'success' && (
					<div className="space-y-4">
						<ul className="space-y-2">
							{catalogue.length === 0 && <li className="text-sm text-muted-foreground">Aún no hay etiquetas.</li>}
							{catalogue.map((label) => (
								<LabelRow
									key={`${label.idLeadActivityLabel}:${label.name}:${label.color}`}
									label={label}
									onSave={labels.saveLabel}
									onRemove={labels.removeLabel}
								/>
							))}
						</ul>
						<form onSubmit={submit} className="flex items-center gap-2">
							<Input aria-label="Nueva etiqueta de actividad" placeholder="Nueva etiqueta" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
							<input aria-label="Color de la etiqueta nueva" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-9 w-10 rounded border" />
							<Button type="submit" size="sm" disabled={!name.trim()}>
								Agregar
							</Button>
						</form>
					</div>
				)}
				{labels.actionError && <p role="alert" className="text-sm text-destructive">{labels.actionError}</p>}
			</DialogContent>
		</Dialog>
	)
}
