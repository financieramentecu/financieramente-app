'use client'

import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { fetchLeadCandidates, fetchOriginOptions, useRelateLead } from '@/features/leads/hooks/use-relate-lead'
import type { AssignedLeadOwner } from '@/features/leads/hooks/use-assign-lead-owner'
import { LEAD_LINK_SIDES } from '@/features/leads/types/lead-link.types'
import type { LeadCandidate, LeadRelationSummary } from '@/features/leads/types/lead-link.types'

interface LeadRelationPanelProps {
	idLead: number
	relations: LeadRelationSummary[]
	canManage: boolean
	onRelated?: (owner: AssignedLeadOwner | null, relations: LeadRelationSummary[]) => void
}

/** Assigns a catalogue origin and links this lead to another one of the same person. */
export function LeadRelationPanel({ idLead, relations, canManage, onRelated }: LeadRelationPanelProps) {
	const { state, relate } = useRelateLead()
	const [items, setItems] = useState(relations)
	const [origins, setOrigins] = useState<Array<{ idClientOrigin: number; name: string }>>([])
	const [originId, setOriginId] = useState('')
	const [query, setQuery] = useState('')
	const [candidates, setCandidates] = useState<LeadCandidate[]>([])
	const [selectedId, setSelectedId] = useState<number | null>(null)
	const [searchError, setSearchError] = useState('')
	const alreadyLinked = items.length > 0
	const pending = state.status === 'loading'

	useEffect(() => {
		if (!canManage || alreadyLinked) return
		let cancelled = false
		void fetchOriginOptions().then((options) => {
			if (!cancelled) setOrigins(options)
		})
		return () => {
			cancelled = true
		}
	}, [canManage, alreadyLinked, idLead])

	async function handleSearch() {
		setSearchError('')
		setSelectedId(null)
		try {
			setCandidates(await fetchLeadCandidates(idLead, query))
		} catch (cause) {
			setCandidates([])
			setSearchError(cause instanceof Error ? cause.message : 'No fue posible buscar leads')
		}
	}

	async function handleRelate() {
		if (selectedId == null) return
		const parsedOrigin = Number(originId)
		const idClientOrigin =
			originId && Number.isInteger(parsedOrigin) && parsedOrigin > 0 ? parsedOrigin : null
		const related = await relate(idLead, selectedId, idClientOrigin)
		if (!related) return
		const next = [related.relation, ...items]
		setItems(next)
		const owner =
			related.idUser != null && related.ownerName
				? { idUser: related.idUser, ownerName: related.ownerName }
				: null
		onRelated?.(owner, next)
	}

	return (
		<section aria-label="Relación con otro lead" className="space-y-3 rounded-md border border-border p-3">
			<div className="flex items-center gap-2">
				<Link2 className="size-4 text-slate-500" aria-hidden />
				<h3 className="text-sm font-semibold">Misma persona, otro ingreso</h3>
			</div>
			{items.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Este lead todavía no está relacionado con otro.
				</p>
			) : (
				<ul className="space-y-2">
					{items.map((item) => (
						<li key={item.idLeadLink} className="rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
							{item.side === LEAD_LINK_SIDES.INCOMING
								? item.originName === 'Sin origen'
									? `Quedó relacionado con ${item.otherName}.`
									: `Ingresó por ${item.originName} y está relacionado con ${item.otherName}.`
								: item.originName === 'Sin origen'
									? `Está relacionado con ${item.otherName}.`
									: `Está relacionado con ${item.otherName}. Ese ingreso es por ${item.originName}.`}
						</li>
					))}
				</ul>
			)}
			{canManage && !alreadyLinked ? (
				<div className="space-y-2">
					<p className="text-xs text-muted-foreground">
						Si los datos no coinciden, relaciónalo con el lead de la misma persona. El origen es opcional. El Money Strategy queda igual y el ingreso se ve en el historial. Al convertir, el cliente se busca por documento y queda una sola ficha.
					</p>
					<label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
						Origen del sistema (opcional)
						<select
							aria-label="Origen del sistema"
							className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
							value={originId}
							onChange={(event) => setOriginId(event.target.value)}
						>
							<option value="">Sin origen</option>
							{origins.map((origin) => (
								<option key={origin.idClientOrigin} value={origin.idClientOrigin}>
									{origin.name}
								</option>
							))}
						</select>
					</label>
					<div className="flex gap-2">
						<input
							aria-label="Buscar lead para relacionar"
							className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
							placeholder="Nombre, correo, celular o documento"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
						/>
						<Button type="button" size="sm" variant="outline" onClick={() => void handleSearch()}>
							Buscar
						</Button>
					</div>
					{candidates.length > 0 ? (
						<ul className="space-y-1">
							{candidates.map((candidate) => (
								<li key={candidate.idLead}>
									<button
										type="button"
										aria-pressed={selectedId === candidate.idLead}
										className={
											selectedId === candidate.idLead
												? 'w-full rounded-md border border-primary bg-primary/5 px-2 py-1.5 text-left text-sm'
												: 'w-full rounded-md border border-border px-2 py-1.5 text-left text-sm'
										}
										onClick={() => setSelectedId(candidate.idLead)}
									>
										<span className="font-medium">{candidate.name}</span>
										{candidate.originTag ? (
											<span className="text-muted-foreground"> · {candidate.originTag}</span>
										) : null}
									</button>
								</li>
							))}
						</ul>
					) : null}
					<Button
						type="button"
						size="sm"
						disabled={selectedId == null || pending}
						onClick={() => void handleRelate()}
					>
						{pending ? 'Relacionando…' : 'Relacionar lead'}
					</Button>
					{searchError ? (
						<p role="alert" className="text-sm text-destructive">
							{searchError}
						</p>
					) : null}
					{state.status === 'error' ? (
						<p role="alert" className="text-sm text-destructive">
							{state.error}
						</p>
					) : null}
				</div>
			) : null}
		</section>
	)
}
