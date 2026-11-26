'use client'

import { useState, type FormEvent } from 'react'
import { useSession } from 'next-auth/react'
import { canManageCrm } from '@/features/leads/crm/crm-policy'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { SingleSelect } from '@/features/shared/ui/single-select'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogTrigger,
} from '@/features/shared/ui/dialog'
import { useLeadCaptures } from '@/features/leads/captures/use-lead-captures'
import { useCreateLead } from '@/features/leads/hooks/use-create-lead'
import { useHierarchyAdvisors } from '@/features/leads/hooks/use-hierarchy-advisors'
import type { CreatedLead } from '@/features/leads/lib/create-lead.schema'

interface CreateLeadDialogProps {
	onCreated: (lead: CreatedLead) => void
}

export function CreateLeadDialog({ onCreated }: CreateLeadDialogProps) {
	const { data: session } = useSession()
	const [open, setOpen] = useState(false)
	const mutation = useCreateLead()
	if (!canManageCrm(session?.user?.role)) return null
	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (mutation.state.status === 'loading') return
				if (next) mutation.reset()
				setOpen(next)
			}}
		>
			<DialogTrigger asChild>
				<Button size="sm">Nuevo lead</Button>
			</DialogTrigger>
			{open ? (
				<CreateLeadForm
					mutation={mutation}
					onCreated={(lead) => {
						setOpen(false)
						onCreated(lead)
					}}
				/>
			) : null}
		</Dialog>
	)
}

function CreateLeadForm({
	onCreated,
	mutation,
}: CreateLeadDialogProps & { mutation: ReturnType<typeof useCreateLead> }) {
	const advisors = useHierarchyAdvisors(true)
	const captures = useLeadCaptures()
	const [idLeadCapture, setIdLeadCapture] = useState('')
	const { state, create } = mutation
	const [idUser, setIdUser] = useState('')
	const pending = state.status === 'loading'
	const ready = advisors.state.status === 'success'

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (pending || !ready) return
		const values = Object.fromEntries(new FormData(event.currentTarget))
		const result = await create({
			...values,
			...(idLeadCapture ? { idLeadCapture: Number(idLeadCapture) } : {}),
			...(advisors.canLead && idUser ? { idUser: Number(idUser) } : {}),
		})
		if (result) onCreated(result)
	}

	return (
		<DialogContent
			className="sm:max-w-lg"
			onInteractOutside={(event) => {
				if (pending) event.preventDefault()
			}}
			onEscapeKeyDown={(event) => {
				if (pending) event.preventDefault()
			}}
		>
			<DialogHeader>
				<DialogTitle>Nuevo lead</DialogTitle>
				<DialogDescription>
					Ingresa los datos básicos. El lead se creará en Lead Nuevo con origen
					Propio.
				</DialogDescription>
			</DialogHeader>
			<form onSubmit={(event) => void submit(event)} className="space-y-4">
				<fieldset disabled={pending} className="space-y-3">
					<label className="block space-y-1 text-sm">
						Nombre
						<Input
							name="name"
							required
							maxLength={200}
							autoComplete="given-name"
						/>
					</label>
					<label className="block space-y-1 text-sm">
						Apellido
						<Input name="lastName" maxLength={200} autoComplete="family-name" />
					</label>
					<label className="block space-y-1 text-sm">
						Correo
						<Input
							name="email"
							type="email"
							maxLength={150}
							autoComplete="email"
						/>
					</label>
					<label className="block space-y-1 text-sm">
						Teléfono
						<Input name="phone" type="tel" maxLength={30} autoComplete="tel" />
					</label>
					<label className="block space-y-1 text-sm">
						Documento
						<Input name="identityNumber" maxLength={20} />
					</label>
					<div className="space-y-1">
						<p className="text-sm">Captura / oferta</p>
						<SingleSelect
							ariaLabel="Captura / oferta"
							placeholder="Sin captura"
							value={idLeadCapture}
							onChange={setIdLeadCapture}
							disabled={pending || captures.state.status !== 'success'}
							options={
								captures.state.status === 'success'
									? captures.state.data.map((capture) => ({
											value: String(capture.idLeadCapture),
											label: capture.name,
										}))
									: []
							}
						/>
						{captures.state.status === 'loading' && (
							<p role="status" className="text-xs">
								Cargando capturas…
							</p>
						)}
						{captures.state.status === 'error' && (
							<p role="alert" className="text-sm text-destructive">
								{captures.state.error}
							</p>
						)}
					</div>
					<label className="block space-y-1 text-sm">
						Quién lo refirió (opcional)
						<Input name="referrerName" maxLength={200} />
					</label>
					<p className="text-xs text-muted-foreground">
						Ingresa al menos correo, teléfono o documento.
					</p>
					{advisors.state.status === 'success' && advisors.canLead ? (
						<div className="space-y-1">
							<p className="text-sm font-medium">Money Strategy</p>
							<SingleSelect
								ariaLabel="Money Strategy"
								searchLabel="Buscar Money Strategy"
								placeholder="Asignarme el lead"
								value={idUser}
								onChange={setIdUser}
								disabled={pending}
								options={advisors.state.data.map((advisor) => ({
									value: String(advisor.idUser),
									label: advisor.name,
								}))}
							/>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							El lead quedará asignado a ti.
						</p>
					)}
				</fieldset>
				{advisors.state.status === 'error' ? (
					<p role="alert" className="text-sm text-destructive">
						{advisors.state.error}
					</p>
				) : null}
				{state.status === 'error' ? (
					<p role="alert" className="text-sm text-destructive">
						{state.error}
					</p>
				) : null}
				<DialogFooter>
					<Button type="submit" disabled={pending || !ready}>
						{pending ? 'Creando…' : 'Crear lead'}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	)
}
