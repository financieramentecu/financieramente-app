'use client'

import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { Button } from '@/features/shared/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/features/shared/ui/dialog'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { cn } from '@/lib/utils'
import { useLeaderPicker } from '../hooks/use-leader-picker'
import { useUpdatePartner } from '../hooks/use-update-partner'
import { updatePartnerSchema } from '../lib/partner-schemas'
import type { PartnerDto } from '../types/partner.types'
import {
	FieldError,
	IDENTITY_OPTIONS,
	LeaderPickerFields,
	LockedCategoryField,
} from './partner-form-parts'

type FormInput = z.input<typeof updatePartnerSchema>
type FormOutput = z.output<typeof updatePartnerSchema>

interface EditPartnerDialogProps {
	open: boolean
	/** Mount with `key={partner.id}` so the form starts from this partner. */
	partner: PartnerDto
	onOpenChange: (open: boolean) => void
	onUpdated: (partner: PartnerDto) => void
}

/** Edit dialog (PM-09): same fields as create, email read-only, category locked. */
export function EditPartnerDialog({
	open,
	partner,
	onOpenChange,
	onUpdated,
}: EditPartnerDialogProps) {
	const { state, submit, reset: resetRequest } = useUpdatePartner()
	const picker = useLeaderPicker(partner.leader?.levelCode ?? null)
	const {
		register,
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<FormInput, unknown, FormOutput>({
		resolver: zodResolver(updatePartnerSchema),
		defaultValues: {
			name: partner.name,
			lastName: partner.lastName ?? '',
			typeIdentity: partner.typeIdentity as FormInput['typeIdentity'],
			identityNumber: partner.identityNumber ?? '',
			phone: partner.phone ?? '',
			leaderId: partner.leader?.id,
		},
	})

	const isSubmitting = state.status === 'loading'

	async function onSubmit(values: FormOutput) {
		const outcome = await submit(partner.id, values)
		if (!outcome.ok) return
		onUpdated(outcome.data)
		onOpenChange(false)
	}

	function handleOpenChange(next: boolean) {
		if (!next) resetRequest()
		onOpenChange(next)
	}

	function handleLevelChange(code: string, clearLeader: () => void) {
		// Not resetField: its default is the current leader, which would be restored.
		clearLeader()
		void picker.selectLevel(code)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Editar partner</DialogTitle>
					<DialogDescription>
						Actualiza los datos de contacto, el documento y el líder. El correo
						no se puede modificar.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={handleSubmit(onSubmit)}
					className="space-y-4"
					noValidate
				>
					{state.status === 'error' && (
						<Alert variant="destructive">
							<AlertDescription>{state.error}</AlertDescription>
						</Alert>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="partner-name">
								Nombre<span className="text-destructive ml-1">*</span>
							</Label>
							<Input
								id="partner-name"
								{...register('name')}
								className={cn(errors.name && 'border-destructive')}
							/>
							<FieldError message={errors.name?.message} />
						</div>

						<div className="space-y-2">
							<Label htmlFor="partner-last-name">Apellido</Label>
							<Input id="partner-last-name" {...register('lastName')} />
							<FieldError message={errors.lastName?.message} />
						</div>

						<div className="space-y-2">
							<Label htmlFor="partner-type-identity">Tipo de documento</Label>
							<Controller
								name="typeIdentity"
								control={control}
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger id="partner-type-identity">
											<SelectValue placeholder="Seleccionar..." />
										</SelectTrigger>
										<SelectContent>
											{IDENTITY_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							<FieldError message={errors.typeIdentity?.message} />
						</div>

						<div className="space-y-2">
							<Label htmlFor="partner-identity-number">
								Número de documento
								<span className="text-destructive ml-1">*</span>
							</Label>
							<Input
								id="partner-identity-number"
								{...register('identityNumber')}
								className={cn(errors.identityNumber && 'border-destructive')}
							/>
							<FieldError message={errors.identityNumber?.message} />
						</div>

						<div className="space-y-2">
							<Label htmlFor="partner-email">Correo electrónico</Label>
							<Input
								id="partner-email"
								type="email"
								value={partner.email}
								readOnly
								disabled
							/>
							<p className="text-xs text-muted-foreground">
								El correo es el identificador de acceso y no se puede editar.
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="partner-phone">Teléfono</Label>
							<Input id="partner-phone" {...register('phone')} />
							<FieldError message={errors.phone?.message} />
						</div>

						<LockedCategoryField hint="La categoría y el nivel del partner no se pueden cambiar." />

						<Controller
							name="leaderId"
							control={control}
							render={({ field }) => (
								<LeaderPickerFields
									picker={picker}
									leaderId={field.value}
									errorMessage={errors.leaderId?.message}
									onLevelChange={(code) =>
										handleLevelChange(code, () => field.onChange(undefined))
									}
									onLeaderChange={field.onChange}
								/>
							)}
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Guardando...' : 'Guardar cambios'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
