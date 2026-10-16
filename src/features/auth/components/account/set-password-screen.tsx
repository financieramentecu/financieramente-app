'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { Button } from '@/features/shared/ui/button'
import { PasswordInput } from '@/features/shared/ui/password-input'
import { Label } from '@/features/shared/ui/label'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { accountPasswordSchema } from '../../lib/account-password.schema'
import { useSetPassword } from '../../hooks/use-set-password'
import { AuthPageShell } from './auth-page-shell'
import { PasswordRequirementsChecklist } from './password-requirements-checklist'

export type SetPasswordMode = 'activate' | 'reset'

interface SetPasswordScreenProps {
	mode: SetPasswordMode
	token: string | null
	/** Decided on the server by the page (`peekToken`); no client round trip. */
	linkValid: boolean
}

const COPY = {
	activate: {
		endpoint: 'activate',
		title: 'Activa tu cuenta',
		description: 'Crea tu contraseña para empezar a usar Financieramente.',
		submit: 'Activar cuenta',
		submitting: 'Activando...',
		successTitle: 'Cuenta activada',
		successDescription:
			'Ya puedes iniciar sesión con tu correo y tu contraseña.',
	},
	reset: {
		endpoint: 'reset-password',
		title: 'Restablece tu contraseña',
		description: 'Elige una nueva contraseña para tu cuenta.',
		submit: 'Restablecer contraseña',
		submitting: 'Guardando...',
		successTitle: 'Contraseña actualizada',
		successDescription: 'Ya puedes iniciar sesión con tu nueva contraseña.',
	},
} as const

/** Drops `token` from the address bar; the screen keeps it in its props. */
function stripTokenFromAddressBar() {
	const url = new URL(window.location.href)
	if (!url.searchParams.has('token')) return
	url.searchParams.delete('token')
	window.history.replaceState(window.history.state, '', url)
}

export function SetPasswordScreen({
	mode,
	token,
	linkValid,
}: SetPasswordScreenProps) {
	const copy = COPY[mode]
	const { state, submit } = useSetPassword(copy.endpoint)
	const [password, setPassword] = useState('')
	const [confirmation, setConfirmation] = useState('')
	const [validationError, setValidationError] = useState('')

	useEffect(() => {
		stripTokenFromAddressBar()
	}, [])

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!token) return

		const parsed = accountPasswordSchema.safeParse(password)
		if (!parsed.success) {
			setValidationError(
				parsed.error.issues[0]?.message ??
					'La contraseña no cumple los requisitos mínimos'
			)
			return
		}
		if (password !== confirmation) {
			setValidationError('Las contraseñas no coinciden')
			return
		}
		setValidationError('')
		await submit(token, password)
	}

	if (!linkValid || !token) {
		return (
			<AuthPageShell>
				<div className="space-y-3 text-center">
					<h1 className="text-lg font-semibold">Enlace inválido o vencido</h1>
					<p className="text-sm text-muted-foreground">
						{mode === 'reset'
							? 'Solicita un nuevo enlace para restablecer tu contraseña.'
							: 'Solicita un nuevo enlace de activación a tu administrador.'}
					</p>
					{mode === 'reset' ? (
						<Link
							href="/forgot-password"
							className="text-sm font-medium text-primary hover:underline"
						>
							Solicitar un nuevo enlace
						</Link>
					) : (
						<Link
							href="/login"
							className="text-sm font-medium text-primary hover:underline"
						>
							Ir a iniciar sesión
						</Link>
					)}
				</div>
			</AuthPageShell>
		)
	}

	if (state.status === 'success') {
		return (
			<AuthPageShell>
				<div className="space-y-3 text-center">
					<h1 className="text-lg font-semibold">{copy.successTitle}</h1>
					<p className="text-sm text-muted-foreground">
						{copy.successDescription}
					</p>
					<Button asChild className="w-full">
						<Link href="/login">Ir a iniciar sesión</Link>
					</Button>
				</div>
			</AuthPageShell>
		)
	}

	const isSubmitting = state.status === 'loading'
	const errorMessage = validationError || state.error

	return (
		<AuthPageShell>
			<div className="space-y-1 text-center">
				<h1 className="text-lg font-semibold">{copy.title}</h1>
				<p className="text-sm text-muted-foreground">{copy.description}</p>
			</div>
			<form className="space-y-4" onSubmit={handleSubmit} noValidate>
				<div className="space-y-2">
					<Label htmlFor="account-password">Nueva contraseña</Label>
					<PasswordInput
						id="account-password"
						autoComplete="new-password"
						aria-describedby="account-password-requirements"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						required
						disabled={isSubmitting}
					/>
					<div id="account-password-requirements">
						<PasswordRequirementsChecklist password={password} />
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="account-password-confirm">Confirmar contraseña</Label>
					<PasswordInput
						id="account-password-confirm"
						autoComplete="new-password"
						value={confirmation}
						onChange={(event) => setConfirmation(event.target.value)}
						required
						disabled={isSubmitting}
					/>
				</div>
				{errorMessage ? (
					<Alert variant="destructive">
						<AlertDescription>{errorMessage}</AlertDescription>
					</Alert>
				) : null}
				<Button
					type="submit"
					className="w-full"
					disabled={isSubmitting || !password || !confirmation}
				>
					{isSubmitting ? copy.submitting : copy.submit}
				</Button>
			</form>
		</AuthPageShell>
	)
}
