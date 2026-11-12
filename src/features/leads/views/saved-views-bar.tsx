'use client'

import * as React from 'react'
import { Bookmark, Trash2 } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import type { SavedLeadTableQuery } from '@/features/leads/views/lead-saved-view.types'
import { useSavedViews } from '@/features/leads/views/use-saved-views'

const SELECT_CLASS = 'h-9 rounded-md border border-input bg-background px-2 text-sm'

/** Twenty-style saved views: apply, save the current filters, delete. Views are personal. */
export function SavedViewsBar({
	currentQuery,
	onApply,
}: {
	currentQuery: SavedLeadTableQuery
	onApply: (query: SavedLeadTableQuery) => void
}) {
	const { state, actionError, save, remove } = useSavedViews()
	const [selectedId, setSelectedId] = React.useState('')
	const [naming, setNaming] = React.useState(false)
	const [name, setName] = React.useState('')
	const views = state.status === 'success' ? state.data : []

	function apply(value: string) {
		setSelectedId(value)
		const view = views.find((candidate) => String(candidate.idLeadSavedView) === value)
		if (view) onApply(view.query)
	}

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!name.trim()) return
		const view = await save(name.trim(), currentQuery)
		if (view) {
			setSelectedId(String(view.idLeadSavedView))
			setNaming(false)
			setName('')
		}
	}

	async function deleteSelected() {
		if (selectedId && (await remove(Number(selectedId)))) setSelectedId('')
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<label className="sr-only" htmlFor="saved-view-select">
				Vistas guardadas
			</label>
			<select
				id="saved-view-select"
				className={SELECT_CLASS}
				value={selectedId}
				onChange={(event) => apply(event.target.value)}
				disabled={views.length === 0}
			>
				<option value="">{views.length === 0 ? 'Sin vistas guardadas' : 'Vistas guardadas'}</option>
				{views.map((view) => (
					<option key={view.idLeadSavedView} value={view.idLeadSavedView}>
						{view.name}
					</option>
				))}
			</select>
			{selectedId && (
				<Button type="button" size="sm" variant="ghost" onClick={deleteSelected} aria-label="Eliminar vista">
					<Trash2 className="size-4" aria-hidden />
				</Button>
			)}
			{naming ? (
				<form onSubmit={submit} className="flex items-center gap-2">
					<Input
						aria-label="Nombre de la vista"
						placeholder="Nombre de la vista"
						value={name}
						maxLength={60}
						onChange={(event) => setName(event.target.value)}
						className="h-9 w-48"
						autoFocus
					/>
					<Button type="submit" size="sm" disabled={!name.trim()}>
						Guardar
					</Button>
					<Button type="button" size="sm" variant="ghost" onClick={() => setNaming(false)}>
						Cancelar
					</Button>
				</form>
			) : (
				<Button type="button" size="sm" variant="outline" onClick={() => setNaming(true)}>
					<Bookmark className="size-4" aria-hidden />
					Guardar vista
				</Button>
			)}
			{actionError && (
				<p role="alert" className="w-full text-sm text-destructive">
					{actionError}
				</p>
			)}
		</div>
	)
}
