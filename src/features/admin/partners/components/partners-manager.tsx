'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { Button } from '@/features/shared/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import { ConfirmActionDialog } from '@/features/shared/ui/confirm-action-dialog'
import { useFeatureFlag } from '@/features/shared/hooks/use-feature-flag'
import {
	usePartnerActions,
	type PartnerAction,
} from '../hooks/use-partner-actions'
import { usePartners } from '../hooks/use-partners'
import type { PartnerDto, PartnerWithEmailResult } from '../types/partner.types'
import { CreatePartnerDialog } from './create-partner-dialog'
import { EditPartnerDialog } from './edit-partner-dialog'
import { PartnersTable } from './partners-table'

const EMAIL_FAILED_MESSAGE =
	'no se pudo enviar el correo de activación. Usa "Reenviar activación" para intentarlo de nuevo.'

const SUCCESS_MESSAGES: Record<Exclude<PartnerAction, 'resend'>, string> = {
	deactivate: 'Partner desactivado',
	reactivate: 'Partner reactivado',
}

/** Container for the Admin > Partners page: list, create and lifecycle actions. */
export function PartnersManager() {
	const { state, refresh } = usePartners()
	const { pending, run } = usePartnerActions(refresh)
	const { update } = useSession()
	const { enabled: impersonationEnabled } = useFeatureFlag(
		'impersonation_select'
	)
	const [createOpen, setCreateOpen] = useState(false)
	const [toDeactivate, setToDeactivate] = useState<PartnerDto | null>(null)
	const [toEdit, setToEdit] = useState<PartnerDto | null>(null)

	async function execute(action: PartnerAction, partner: PartnerDto) {
		const outcome = await run(action, partner.id)
		if (!outcome.ok) {
			toast.error(outcome.error)
			return
		}
		if (action === 'resend') {
			if (outcome.emailSent) {
				toast.success(`Se envió el correo de activación a ${partner.email}`)
			} else {
				toast.warning(`Se generó un nuevo enlace, pero ${EMAIL_FAILED_MESSAGE}`)
			}
			return
		}
		toast.success(SUCCESS_MESSAGES[action])
	}

	function handleAction(action: PartnerAction, partner: PartnerDto) {
		if (action === 'deactivate') {
			setToDeactivate(partner)
			return
		}
		void execute(action, partner)
	}

	function handleConfirmDeactivate() {
		const partner = toDeactivate
		setToDeactivate(null)
		if (partner) void execute('deactivate', partner)
	}

	function handleCreated(partner: PartnerWithEmailResult) {
		void refresh()
		if (partner.emailSent) {
			toast.success(
				`Partner creado. Se envió el correo de activación a ${partner.email}`
			)
		} else {
			toast.warning(`Partner creado, pero ${EMAIL_FAILED_MESSAGE}`)
		}
	}

	function handleUpdated() {
		void refresh()
		toast.success('Partner actualizado')
	}

	async function handleImpersonate(partner: PartnerDto) {
		try {
			await update({ impersonateUserId: partner.id.toString() })
			toast.success('Iniciando sesión como partner...')
			window.location.href = '/dashboard'
		} catch (error) {
			console.error(error)
			toast.error('Error al iniciar sesión como partner')
		}
	}

	return (
		<div className="space-y-4 md:space-y-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">
						Gestión de Partners
					</h1>
					<p className="text-muted-foreground mt-1 text-sm md:text-base hidden sm:block">
						Crea partners externos, reenvía su activación y controla su acceso
					</p>
				</div>
				<Button className="gap-2" onClick={() => setCreateOpen(true)}>
					<Plus className="h-4 w-4" />
					Crear partner
				</Button>
			</div>

			{state.status === 'error' && (
				<Alert variant="destructive">
					<AlertDescription>{state.error}</AlertDescription>
				</Alert>
			)}

			<Card className="shadow-none sm:shadow-sm">
				<CardHeader className="pb-3 md:pb-6">
					<CardTitle className="text-xl md:text-2xl">Partners</CardTitle>
					<CardDescription className="hidden sm:block">
						Estado de activación, líder y fecha de creación de cada partner
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PartnersTable
						partners={state.status === 'success' ? state.data : []}
						isLoading={state.status === 'loading'}
						pending={pending}
						onAction={handleAction}
						onEdit={setToEdit}
						onImpersonate={impersonationEnabled ? handleImpersonate : undefined}
					/>
				</CardContent>
			</Card>

			<CreatePartnerDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				onCreated={handleCreated}
			/>

			{toEdit && (
				<EditPartnerDialog
					key={toEdit.id}
					open
					partner={toEdit}
					onOpenChange={(open) => {
						if (!open) setToEdit(null)
					}}
					onUpdated={handleUpdated}
				/>
			)}

			<ConfirmActionDialog
				open={toDeactivate !== null}
				title="Desactivar partner"
				description={`${toDeactivate?.name ?? 'El partner'} perderá el acceso al sistema en su próxima solicitud y sus enlaces pendientes dejarán de funcionar.`}
				confirmLabel="Desactivar"
				onConfirm={handleConfirmDeactivate}
				onCancel={() => setToDeactivate(null)}
			/>
		</div>
	)
}
