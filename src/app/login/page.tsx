'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { LoginView, type EmailSignInFormProps } from '@/features/auth/components/login'
import { GoogleIcon } from '@/features/auth/components/login/social-sign-in'
import { toast } from 'sonner'
import type { SocialProvider } from '@/features/auth/components/login/social-sign-in'
import { ErrorMessage } from '@/features/auth/components/error-message'

/**
 * Componente interno que usa useSearchParams
 */
function LoginContent() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const [isSubmitting, setIsSubmitting] = useState(false)

	const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard'
	const error = searchParams?.get('error')
	const isSuperAdminMode = searchParams?.get('superadmin') === 'true'

	// Redirigir a /access-denied si hay error de acceso denegado
	if (error === 'AccessDenied' || error === 'AccountDisabled') {
		const reason = error === 'AccountDisabled' ? 'inactive' : 'no_permissions'
		router.replace(`/access-denied?reason=${reason}`)
		return null // Evitar renderizar mientras redirige
	}

	const handleGoogleSignIn = async () => {
		try {
			setIsSubmitting(true)
			await signIn('google', {
				callbackUrl,
				redirect: true,
			})
			// Si redirect: true, signIn no retorna (la redirección maneja el flujo)
		} catch (error) {
			console.error('Error en autenticación:', error)
			toast.error('Error inesperado', {
				description: 'Ocurrió un error al intentar iniciar sesión.',
			})
			setIsSubmitting(false)
		}
	}

	const handleEmailPasswordSignIn = async (email: string, password: string) => {
		// Validar dominio corporativo
		const emailDomain = email.split('@')[1]
		if (emailDomain !== 'financieramentecu.com') {
			toast.error('Dominio no autorizado', {
				description:
					'Solo se permite el acceso con correos corporativos (@financieramentecu.com). Por favor, utiliza tu cuenta institucional.',
			})
			return
		}

		try {
			setIsSubmitting(true)
			const result = await signIn('credentials', {
				email,
				password,
				callbackUrl,
				redirect: false,
			})

			if (result?.error) {
				toast.error('Error de autenticación', {
					description:
						'Credenciales inválidas o usuario no autorizado para este método de acceso.',
				})
				setIsSubmitting(false)
				return
			}

			if (result?.ok) {
				toast.success('Inicio de sesión exitoso')
				router.push(callbackUrl)
			}
		} catch (error) {
			console.error('Error en autenticación con credenciales:', error)
			toast.error('Error inesperado', {
				description: 'Ocurrió un error al intentar iniciar sesión.',
			})
			setIsSubmitting(false)
		}
	}

	const handleEmailSignIn: EmailSignInFormProps['onSubmit'] = async () => {
		// Para Google OAuth, redirigimos al flujo de Google
		toast.info('Usa Google para iniciar sesión', {
			description: 'Por favor, usa el botón de Google para autenticarte.',
		})
		await handleGoogleSignIn()
	}

	const socialProviders: SocialProvider[] = [
		{
			id: 'google',
			label: 'Continuar con Google',
			icon: <GoogleIcon className="size-5" />,
			onClick: handleGoogleSignIn,
			buttonProps: {
				disabled: isSubmitting,
			},
		},
	]

	return (
		<>
			<ErrorMessage error={error} />
			<LoginView
				showEmailPasswordForm={isSuperAdminMode}
				emailPasswordForm={
					isSuperAdminMode
						? {
							emailPlaceholder: 'admin@financieramentecu.com',
							passwordPlaceholder: '••••••••',
							submitLabel: 'Ingresar',
							isSubmitting,
							onSubmit: handleEmailPasswordSignIn,
						}
						: undefined
				}
				emailForm={{
					placeholder: 'usuario@financieramentecu.com',
					submitLabel: 'Ingresar con correo',
					isSubmitting,
					onSubmit: handleEmailSignIn,
				}}
				socialProviders={socialProviders}
				termsLink={{
					label: 'Términos y condiciones',
					href: '#',
				}}
			/>
		</>
	)
}

/**
 * Página de Login
 *
 * Integra el componente LoginView maquetado con NextAuth
 * Maneja la autenticación con Google OAuth
 */
export default function LoginPage() {
	return (
		<Suspense fallback={<div>Cargando...</div>}>
			<LoginContent />
		</Suspense>
	)
}
