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
import { useCreatePartner } from '../hooks/use-create-partner'
import { useLeaderPicker } from '../hooks/use-leader-picker'
import { createPartnerSchema } from '../lib/partner-schemas'
import type { PartnerWithEmailResult } from '../types/partner.types'
import {
	FieldError,
	IDENTITY_OPTIONS,
	LeaderPickerFields,
	LockedCategoryField,
} from './partner-form-parts'

type FormInput = z.input<typeof createPartnerSchema>
type FormOutput = z.output<typeof createPartnerSchema>

interface CreatePartnerDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onCreated: (partner: PartnerWithEmailResult) => void
}

export function CreatePartnerDialog({
	open,
	onOpenChange,
	onCreated,
}: CreatePartnerDialogProps) {
	const { state, submit, reset: resetRequest } = useCreatePartner()
	const picker = useLeaderPicker()
	const {
		register,
		control,
		handleSubmit,
		resetField,
		reset,
		formState: { errors },
	} = useForm<FormInput, unknown, FormOutput>({
		resolver: zodResolver(createPartnerSchema),
		defaultValues: {
			name: '',
			lastName: '',
			typeIdentity: 'CC',
			identityNumber: '',
			email: '',
			phone: '',
		},
	})

	const isSubmitting = state.status === 'loading'

	async function onSubmit(values: FormOutput) {
		const outcome = await submit(values)
		if (!outcome.ok) return
		reset()
		void picker.selectLevel(null)
		onCreated(outcome.data)
		onOpenChange(false)
	}

	function handleOpenChange(next: boolean) {
		if (!next) {
			reset()
			resetRequest()
			void picker.selectLevel(null)
		}
		onOpenChange(next)
	}

	function handleLevelChange(code: string) {
		// The form has no default leader, so resetting the field clears it.
		resetField('leaderId')
		void picker.selectLevel(code)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Crear partner</DialogTitle>
					<DialogDescription>
						El partner recibirá un correo para activar su cuenta y crear su
						contraseña.
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
							<Label htmlFor="partner-email">
								Correo electrónico
								<span className="text-destructive ml-1">*</span>
							</Label>
							<Input
								id="partner-email"
								type="email"
								{...register('email')}
								className={cn(errors.email && 'border-destructive')}
							/>
							<FieldError message={errors.email?.message} />
						</div>

						<div className="space-y-2">
							<Label htmlFor="partner-phone">Teléfono</Label>
							<Input id="partner-phone" {...register('phone')} />
							<FieldError message={errors.phone?.message} />
						</div>

						<LockedCategoryField hint="La categoría, el rol y el nivel se asignan automáticamente." />

						<Controller
							name="leaderId"
							control={control}
							render={({ field }) => (
								<LeaderPickerFields
									picker={picker}
									leaderId={field.value}
									errorMessage={errors.leaderId?.message}
									onLevelChange={handleLevelChange}
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
							{isSubmitting ? 'Creando...' : 'Crear partner'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
