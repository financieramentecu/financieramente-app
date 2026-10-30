'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { useForgotPassword } from '../../hooks/use-forgot-password'
import { AuthPageShell } from './auth-page-shell'

/** Shown for EVERY accepted request, whether or not the account exists. */
const CONFIRMATION_MESSAGE =
	'Si el correo está registrado, te enviaremos un enlace para restablecer tu contraseña.'

export function ForgotPasswordScreen() {
	const { state, submit } = useForgotPassword()
	const [email, setEmail] = useState('')

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		await submit(email.trim())
	}

	const isSubmitting = state.status === 'loading'

	return (
		<AuthPageShell>
			<div className="space-y-1 text-center">
				<h1 className="text-lg font-semibold">¿Olvidaste tu contraseña?</h1>
				<p className="text-sm text-muted-foreground">
					Ingresa tu correo y te enviaremos un enlace para restablecerla.
				</p>
			</div>

			{state.status === 'success' ? (
				<Alert>
					<AlertDescription>{CONFIRMATION_MESSAGE}</AlertDescription>
				</Alert>
			) : (
				<form className="space-y-4" onSubmit={handleSubmit} noValidate>
					<div className="space-y-2">
						<Label htmlFor="forgot-email">Correo electrónico</Label>
						<Input
							id="forgot-email"
							type="email"
							autoComplete="email"
							placeholder="usuario@ejemplo.com"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							required
							disabled={isSubmitting}
						/>
					</div>
					{state.status === 'error' ? (
						<Alert variant="destructive">
							<AlertDescription>{state.error}</AlertDescription>
						</Alert>
					) : null}
					<Button
						type="submit"
						className="w-full"
						disabled={isSubmitting || email.trim().length === 0}
					>
						{isSubmitting ? 'Enviando...' : 'Enviar enlace'}
					</Button>
				</form>
			)}

			<div className="text-center">
				<Link
					href="/login"
					className="text-sm font-medium text-primary hover:underline"
				>
					Volver a iniciar sesión
				</Link>
			</div>
		</AuthPageShell>
	)
}
