'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { DefaultDistributionGroupView } from '@/features/distribution-commission/types/default-distribution.types'

type EditorState = AsyncState<readonly DefaultDistributionGroupView[]>

export function DefaultDistributionEditor() {
	const [state, setState] = useState<EditorState>({
		status: 'idle',
		data: undefined,
		error: '',
	})
	const [drafts, setDrafts] = useState<Record<number, string>>({})
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })
		void fetch('/api/admin/default-distribution', { credentials: 'include' })
			.then(async (response) => {
				const body = (await response.json()) as {
					data?: { groups?: readonly DefaultDistributionGroupView[] }
					error?: string
				}
				if (!response.ok || !body.data?.groups) {
					throw new Error(body.error || 'No se pudo cargar la distribución')
				}
				if (cancelled) return
				setState({ status: 'success', data: body.data.groups, error: '' })
				setDrafts(draftsFromGroups(body.data.groups))
			})
			.catch((error: unknown) => {
				if (cancelled) return
				setState({
					status: 'error',
					data: undefined,
					error:
						error instanceof Error
							? error.message
							: 'No se pudo cargar la distribución',
				})
			})
		return () => {
			cancelled = true
		}
	}, [])

	async function save() {
		if (!state.data) return
		setSaving(true)
		try {
			const lines = state.data.flatMap((group) =>
				group.lines.map((line) => ({
					id: line.id,
					percentage: Number(drafts[line.id]),
				}))
			)
			const response = await fetch('/api/admin/default-distribution', {
				method: 'PUT',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lines }),
			})
			const body = (await response.json()) as {
				data?: { groups?: readonly DefaultDistributionGroupView[] }
				error?: string
			}
			if (!response.ok || !body.data?.groups) {
				throw new Error(body.error || 'No se pudo guardar')
			}
			setState({ status: 'success', data: body.data.groups, error: '' })
			setDrafts(draftsFromGroups(body.data.groups))
			toast.success('Distribución por defecto guardada')
		} catch (error: unknown) {
			toast.error(
				error instanceof Error ? error.message : 'No se pudo guardar'
			)
		} finally {
			setSaving(false)
		}
	}

	if (state.status === 'loading' || state.status === 'idle') {
		return <p className="text-sm text-muted-foreground">Cargando porcentajes...</p>
	}

	if (state.status === 'error') {
		return <p className="text-sm text-destructive">{state.error}</p>
	}

	return (
		<div className="flex flex-col gap-6">
			<p className="text-sm text-muted-foreground">
				Estos porcentajes se usan al crear un producto y al completar
				configuraciones que no tienen distribución. Las distribuciones que ya
				existen no cambian.
			</p>
			{state.data.map((group) => (
				<section key={group.configLevelCode} className="rounded-lg border p-4">
					<h2 className="mb-3 text-sm font-semibold">
						{group.configLevelName} ({group.configLevelCode})
					</h2>
					<div className="grid gap-3 sm:grid-cols-2">
						{group.lines.map((line) => (
							<label key={line.id} className="flex flex-col gap-1 text-sm">
								<span>
									{line.receiverLevelName} ({line.receiverLevelCode})
								</span>
								<Input
									type="number"
									min="0.0001"
									max="100"
									step="0.0001"
									value={drafts[line.id] ?? ''}
									onChange={(event) =>
										setDrafts((current) => ({
											...current,
											[line.id]: event.target.value,
										}))
									}
								/>
							</label>
						))}
					</div>
				</section>
			))}
			<div>
				<Button type="button" onClick={() => void save()} disabled={saving}>
					{saving ? 'Guardando...' : 'Guardar porcentajes'}
				</Button>
			</div>
		</div>
	)
}

function draftsFromGroups(
	groups: readonly DefaultDistributionGroupView[]
): Record<number, string> {
	const drafts: Record<number, string> = {}
	for (const group of groups) {
		for (const line of group.lines) {
			drafts[line.id] = String(line.percentage)
		}
	}
	return drafts
}
