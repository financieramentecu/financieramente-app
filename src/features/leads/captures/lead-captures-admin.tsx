'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { useLeadCaptures } from './use-lead-captures'
import type { LeadCaptureOption } from './lead-capture.types'

export function LeadCapturesAdmin() {
	const { state, reload } = useLeadCaptures(true)
	const [editing, setEditing] = useState<LeadCaptureOption | null>(null)
	const [mutation, setMutation] = useState<AsyncState<null>>({
		status: 'idle',
		data: undefined,
		error: '',
	})
	const pending = mutation.status === 'loading'
	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const form = event.currentTarget
		const values = new FormData(form)
		setMutation({ status: 'loading', data: undefined, error: '' })
		try {
			const response = await fetch(
				editing
					? `/api/admin/lead-captures/${editing.idLeadCapture}`
					: '/api/admin/lead-captures',
				{
					method: editing ? 'PUT' : 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: String(values.get('name')).trim(),
						level: Number(values.get('level')),
						status: values.get('status') === 'on',
					}),
				}
			)
			const body = await response.json()
			if (!response.ok)
				throw new Error(body.error || 'No fue posible guardar la captura')
			setMutation({ status: 'success', data: null, error: '' })
			setEditing(null)
			form.reset()
			reload()
		} catch (cause) {
			setMutation({
				status: 'error',
				data: undefined,
				error:
					cause instanceof Error
						? cause.message
						: 'No fue posible guardar la captura',
			})
		}
	}
	return (
		<section className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Capturas</h1>
				<p className="text-sm text-muted-foreground">
					El nivel ordena la presentación. Desactivar una captura conserva las
					oportunidades existentes.
				</p>
			</div>
			<form
				key={editing?.idLeadCapture ?? 'new'}
				onSubmit={(event) => void save(event)}
				className="space-y-3 rounded-md border p-4"
			>
				<h2 className="font-medium">
					{editing ? 'Editar captura' : 'Crear captura'}
				</h2>
				<fieldset disabled={pending} className="space-y-3">
					<label className="block space-y-1 text-sm">
						Nombre
						<Input
							name="name"
							required
							maxLength={120}
							defaultValue={editing?.name ?? ''}
						/>
					</label>
					<label className="block space-y-1 text-sm">
						Nivel
						<Input
							name="level"
							type="number"
							required
							min={0}
							step={1}
							defaultValue={editing?.level ?? 0}
						/>
					</label>
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="status"
							defaultChecked={editing?.status ?? true}
						/>
						Activa
					</label>
					<div className="flex gap-2">
						<Button type="submit">
							{pending ? 'Guardando…' : 'Guardar captura'}
						</Button>
						{editing && (
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditing(null)}
							>
								Cancelar
							</Button>
						)}
					</div>
				</fieldset>
				{mutation.status === 'error' && (
					<p role="alert" className="text-sm text-destructive">
						{mutation.error}
					</p>
				)}
				{mutation.status === 'success' && (
					<p role="status" className="text-sm">
						Captura guardada
					</p>
				)}
			</form>
			{state.status === 'loading' && <p role="status">Cargando capturas…</p>}
			{state.status === 'error' && (
				<div>
					<p role="alert">{state.error}</p>
					<Button variant="outline" onClick={reload}>
						Reintentar
					</Button>
				</div>
			)}
			{state.status === 'success' &&
				(state.data.length === 0 ? (
					<p>No hay capturas registradas.</p>
				) : (
					<ul className="divide-y rounded-md border">
						{state.data.map((capture) => (
							<li
								key={capture.idLeadCapture}
								className="flex items-center justify-between gap-3 p-3"
							>
								<div>
									<p className="font-medium">{capture.name}</p>
									<p className="text-sm text-muted-foreground">
										Nivel {capture.level} ·{' '}
										{capture.status ? 'Activa' : 'Inactiva'}
									</p>
								</div>
								<Button
									variant="outline"
									disabled={pending}
									aria-label={`Editar ${capture.name}`}
									onClick={() => {
										setEditing(capture)
										setMutation({ status: 'idle', data: undefined, error: '' })
									}}
								>
									Editar
								</Button>
							</li>
						))}
					</ul>
				))}
		</section>
	)
}
