import Link from 'next/link'
import { ExternalLink, Mail, Phone, IdCard, Tag } from 'lucide-react'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetFooter,
} from '@/features/shared/ui/sheet'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Separator } from '@/features/shared/ui/separator'
import {
	LEAD_OUTCOME_STATUS_LABELS,
	LEAD_OUTCOME_STATUS_BADGE_VARIANTS,
} from '@/features/leads/lib/lead-outcome-status'
import { LeadOwnerAvatar } from '@/features/leads/components/lead-owner-avatar'
import type { LeadDetail } from '@/features/leads/types/lead.types'

interface LeadDetailSheetProps {
	lead: LeadDetail | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

/**
 * Read-only lead detail. "Ver en CRM" only renders when `externalUrl` is
 * present and non-empty. "Convertir a negocio" links to the existing
 * business-creation form (`?leadId=`); it becomes "Ver negocio" once the
 * lead is already linked to a `Business` (`idBusiness != null`). A lead
 * with no owner (`idUser == null`) cannot be converted — the button is
 * disabled with an explanatory caption instead of navigating.
 */
export function LeadDetailSheet({
	lead,
	open,
	onOpenChange,
}: LeadDetailSheetProps) {
	if (!lead) return null

	const fullName = [lead.name, lead.lastName].filter(Boolean).join(' ') || 'Sin nombre'
	const hasExternalUrl = Boolean(lead.externalUrl && lead.externalUrl.trim() !== '')
	const isConverted = lead.idBusiness != null
	const hasOwner = lead.idUser != null

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="gap-0">
				<SheetHeader className="pb-3">
					<div className="flex items-start justify-between gap-2">
						<SheetTitle className="flex flex-wrap items-center gap-2 text-lg">
							{fullName}
							<Badge
								variant={LEAD_OUTCOME_STATUS_BADGE_VARIANTS[lead.outcomeStatus]}
							>
								{LEAD_OUTCOME_STATUS_LABELS[lead.outcomeStatus]}
							</Badge>
						</SheetTitle>
						{lead.ownerName && (
							<div className="mr-8 flex shrink-0 flex-col items-end gap-1">
								<LeadOwnerAvatar name={lead.ownerName} size="md" />
								<span className="text-xs text-slate-600 dark:text-slate-300">
									{lead.ownerName}
								</span>
							</div>
						)}
					</div>
					<SheetDescription>Detalle del lead</SheetDescription>
				</SheetHeader>
				<Separator />
				<div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
					{lead.email && (
						<div className="flex items-center gap-2 text-sm text-foreground">
							<Mail className="size-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
							<span className="truncate">{lead.email}</span>
						</div>
					)}
					{lead.phone && (
						<div className="flex items-center gap-2 text-sm text-foreground">
							<Phone className="size-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
							<span>{lead.phone}</span>
						</div>
					)}
					{lead.identityNumber && (
						<div className="flex items-center gap-2 text-sm text-foreground">
							<IdCard className="size-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
							<span>{lead.identityNumber}</span>
						</div>
					)}
					{lead.originTag && (
						<div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
							<Tag className="size-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
							<span className="truncate">{lead.originTag}</span>
						</div>
					)}
					{!lead.email && !lead.phone && !lead.identityNumber && !lead.originTag && (
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Este lead no tiene datos de contacto adicionales.
						</p>
					)}
				</div>
				<SheetFooter className="flex-col gap-2 border-t border-border pt-4">
					{isConverted ? (
						<Button asChild>
							<Link href={`/dashboard/negocios/${lead.idBusiness}`}>
								Ver negocio
							</Link>
						</Button>
					) : hasOwner ? (
						<Button asChild>
							<Link href={`/dashboard/negocios/crear?leadId=${lead.idLead}`}>
								Convertir a negocio
							</Link>
						</Button>
					) : (
						<div className="space-y-1">
							<Button disabled className="w-full">
								Convertir a negocio
							</Button>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Asigna un owner al lead antes de convertirlo a negocio.
							</p>
						</div>
					)}
					{hasExternalUrl && (
						<Button asChild variant="outline">
							<a href={lead.externalUrl!} target="_blank" rel="noreferrer">
								Ver en CRM
								<ExternalLink className="size-3.5" aria-hidden />
							</a>
						</Button>
					)}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}
