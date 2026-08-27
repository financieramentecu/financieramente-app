import * as React from 'react'
import Link from 'next/link'
import { ExternalLink, Mail, Phone, IdCard, Tag, Trash2 } from 'lucide-react'
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
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/features/shared/ui/alert-dialog'
import {
	LEAD_OUTCOME_STATUS_LABELS,
	LEAD_OUTCOME_STATUS_BADGE_VARIANTS,
} from '@/features/leads/lib/lead-outcome-status'
import { LeadOwnerAvatar } from '@/features/leads/components/lead-owner-avatar'
import { canDeleteLead } from '@/features/leads/lib/can-delete-lead'
import { useDeleteLead } from '@/features/leads/hooks/use-delete-lead'
import type { LeadDetail } from '@/features/leads/types/lead.types'

interface LeadDetailSheetProps {
	lead: LeadDetail | null
	open: boolean
	onOpenChange: (open: boolean) => void
	isAdmin?: boolean
	onDeleted?: () => void
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
	isAdmin = false,
	onDeleted,
}: LeadDetailSheetProps) {
	const { state: deleteState, deleteLead } = useDeleteLead()

	React.useEffect(() => {
		if (deleteState.status === 'success') {
			onDeleted?.()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [deleteState.status])

	if (!lead) return null

	const fullName = [lead.name, lead.lastName].filter(Boolean).join(' ') || 'Sin nombre'
	const hasExternalUrl = Boolean(lead.externalUrl && lead.externalUrl.trim() !== '')
	const isConverted = lead.idBusiness != null
	const hasOwner = lead.idUser != null
	const canDelete = isAdmin && canDeleteLead(lead)

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
					{canDelete && (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive" className="w-full">
									<Trash2 className="size-3.5" aria-hidden />
									Eliminar lead
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>¿Eliminar este lead?</AlertDialogTitle>
									<AlertDialogDescription>
										Esta acción oculta el lead del tablero. Un futuro resync
										del CRM puede restaurarlo.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancelar</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => deleteLead(lead.idLead)}
									>
										Confirmar
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}
