'use client'

import { useState, type FormEvent } from 'react'
import { Bell } from 'lucide-react'
import { usePermissions } from '@/features/shared/hooks/use-permissions'
import { toast } from 'sonner'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/features/shared/ui/dialog'
import { TASK_NOTICE_ANTICIPATION } from '@/features/leads/tasks/task-notice.constants'
import { useTaskNoticeSettings } from '@/features/leads/tasks/use-task-notice-settings'

/** Administrators set how many days before due an open task is announced in the app. */
export function TaskNoticeSettings() {
	const { can } = usePermissions()
	const [open, setOpen] = useState(false)
	const settings = useTaskNoticeSettings(open)
	if (!can('leads.configurar_avisos')) return null

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" size="sm" variant="outline">
					<Bell className="size-4" aria-hidden />
					Avisos
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Avisos de vencimiento</DialogTitle>
					<DialogDescription>
						Las tareas de hoy y las que entran en esta anticipación avisan dentro de la aplicación. Las vencidas se envían por correo cada mañana al asesor responsable.
					</DialogDescription>
				</DialogHeader>
				{settings.state.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Cargando…</p>}
				{settings.state.status === 'error' && <p role="alert" className="text-sm text-destructive">{settings.state.error}</p>}
				{settings.state.status === 'success' && (
					<NoticeForm
						key={settings.state.data.anticipationDays}
						anticipationDays={settings.state.data.anticipationDays}
						saving={settings.saving}
						actionError={settings.actionError}
						onSave={settings.save}
					/>
				)}
			</DialogContent>
		</Dialog>
	)
}

function NoticeForm({
	anticipationDays,
	saving,
	actionError,
	onSave,
}: {
	anticipationDays: number
	saving: boolean
	actionError: string
	onSave: (days: number) => Promise<boolean>
}) {
	const [days, setDays] = useState(String(anticipationDays))
	const parsed = Number(days)
	const valid = Number.isInteger(parsed) && parsed >= TASK_NOTICE_ANTICIPATION.MIN_DAYS && parsed <= TASK_NOTICE_ANTICIPATION.MAX_DAYS
	const dirty = parsed !== anticipationDays

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!valid || !dirty) return
		if (await onSave(parsed)) {
			toast.success('Avisos guardados', { description: anticipationDescription(parsed) })
		}
	}

	return (
		<form onSubmit={submit} className="space-y-3">
			<label htmlFor="task-notice-days" className="text-sm font-medium">Días de anticipación</label>
			<Input
				id="task-notice-days"
				type="number"
				inputMode="numeric"
				min={TASK_NOTICE_ANTICIPATION.MIN_DAYS}
				max={TASK_NOTICE_ANTICIPATION.MAX_DAYS}
				step={1}
				value={days}
				onChange={(event) => setDays(event.target.value)}
			/>
			<p className="text-sm text-muted-foreground">{anticipationDescription(valid ? parsed : anticipationDays)}</p>
			{actionError ? <p role="alert" className="text-sm text-destructive">{actionError}</p> : null}
			<Button type="submit" size="sm" disabled={!valid || !dirty || saving}>
				Guardar
			</Button>
		</form>
	)
}

function anticipationDescription(days: number): string {
	if (days === 0) return 'Sin aviso anticipado. Solo se avisa el día del vencimiento.'
	if (days === 1) return 'Se avisa un día antes y el día del vencimiento.'
	return `Se avisa ${days} días antes y el día del vencimiento.`
}
