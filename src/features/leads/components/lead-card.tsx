import { Star } from 'lucide-react'
import { Card, CardContent } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/features/shared/ui/tooltip'
import {
	LEAD_OUTCOME_STATUS_LABELS,
	LEAD_OUTCOME_STATUS_BADGE_VARIANTS,
} from '@/features/leads/lib/lead-outcome-status'
import { LeadOwnerAvatar } from '@/features/leads/components/lead-owner-avatar'
import { InactivityBadge } from '@/features/leads/components/inactivity-badge'
import { originLabelTone } from '@/features/leads/lib/origin-label-tone'
import { cn } from '@/lib/utils'
import type { LeadCard as LeadCardType } from '@/features/leads/types/lead.types'

interface LeadCardProps {
	lead: LeadCardType
	onClick?: (idLead: number) => void
}

/**
 * Presentational Kanban card. The board wraps it when the card can be dragged.
 */
export function LeadCard({ lead, onClick }: LeadCardProps) {
	const fullName =
		[lead.name, lead.lastName].filter(Boolean).join(' ') || 'Sin nombre'
	// A lead counts as converted whenever `idBusiness` is non-null, regardless
	// of the linked Business's current status (including cancelled).
	const isConverted = lead.idBusiness !== null

	return (
		<Card
			role="button"
			tabIndex={0}
			onClick={() => onClick?.(lead.idLead)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') onClick?.(lead.idLead)
			}}
			className={cn(
				'cursor-pointer border-border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-slate-900',
				isConverted &&
					'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20'
			)}
		>
			<CardContent className="space-y-2 p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 space-y-1.5">
						<div className="flex items-center gap-1.5">
							<p className="truncate text-sm font-semibold leading-snug text-foreground">
								{fullName}
							</p>
							{isConverted && (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<span
												className="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-100 p-1 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
												aria-label="Negocio creado"
											>
												<Star
													className="size-3"
													aria-hidden
													fill="currentColor"
												/>
											</span>
										</TooltipTrigger>
										<TooltipContent>Negocio creado</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						</div>
						<div className="flex flex-wrap items-center gap-1.5">
							<Badge
								className="w-fit"
								variant={LEAD_OUTCOME_STATUS_BADGE_VARIANTS[lead.outcomeStatus]}
							>
								{LEAD_OUTCOME_STATUS_LABELS[lead.outcomeStatus]}
							</Badge>
							{lead.originTag && (
								<span
									className={cn(
										'inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[11px] font-medium',
										originLabelTone(lead.originTag)
									)}
								>
									{lead.originTag}
								</span>
							)}
						</div>
						<p className="text-xs text-muted-foreground">
							Captura: {lead.capture?.name ?? 'Sin captura'}
						</p>
						{lead.referrerName && (
							<p className="text-xs text-muted-foreground">
								Referido por: {lead.referrerName}
							</p>
						)}
						<InactivityBadge days={lead.inactiveDays} />
					</div>
					{lead.ownerName && (
						<div className="flex shrink-0 flex-col items-center gap-1">
							<LeadOwnerAvatar name={lead.ownerName} size="sm" />
							<span className="max-w-16 truncate text-center text-[10px] text-slate-500 dark:text-slate-400">
								{lead.ownerName}
							</span>
						</div>
					)}
				</div>
				{lead.captures && lead.captures.length > 1 && (
					<label
						className="block space-y-1 text-xs"
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => event.stopPropagation()}
					>
						Captura / oportunidad
						<select
							aria-label="Captura / oportunidad"
							className="w-full rounded-md border bg-background p-2 text-sm"
							value={lead.idLead}
							onPointerDown={(event) => event.stopPropagation()}
							onChange={(event) => onClick?.(Number(event.target.value))}
						>
							{lead.captures.map((item) => (
								<option key={item.idLead} value={item.idLead}>
									{item.capture?.name ?? 'Sin captura'} · #{item.idLead}
								</option>
							))}
						</select>
					</label>
				)}
				{(lead.email || lead.phone) && (
					<div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
						{lead.email && <p className="truncate">{lead.email}</p>}
						{lead.phone && <p>{lead.phone}</p>}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
