'use client'

import React, { Suspense } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { AlertCircle, LogOut, CheckCircle2, Mail } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/features/shared/ui/alert'

/**
 * Componente interno que usa useSearchParams
 */
function AccessDeniedContent() {
	const searchParams = useSearchParams()
	const reason = searchParams?.get('reason') || 'default'
	const [isSigningOut, setIsSigningOut] = React.useState(false)

	const messages = {
		inactive: {
			title: '⛔ Cuenta Inactiva',
			description: 'Se ha notificado al administrador para activar tu cuenta.',
			details:
				'Tu cuenta ha sido desactivada o está pendiente de activación. Ten en cuenta, se te notificará por correo cuando esté activada por el administrador para que puedas iniciar sesión.',
			variant: 'destructive',
		},
		default_role: {
			title: '🎉 ¡Registro Exitoso!',
			description:
				'Hemos enviado una notificación al administrador para activar tu acceso.',
			details:
				'Tu cuenta ha sido creada correctamente. Como es tu primer acceso, el administrador ha recibido un correo para revisar y otorgar tu acceso al sistema. Te notificaremos por correo cuando esté listo.',
			variant: 'default',
		},
		no_permissions: {
			title: '🚫 Acceso Denegado',
			description: 'No tienes permisos para acceder a esta sección.',
			details:
				'No tienes los permisos necesarios para acceder a esta funcionalidad. Si crees que esto es un error, contacta al administrador.',
			variant: 'destructive',
		},
		default: {
			title: '🚫 Acceso Denegado',
			description:
				'No tienes permisos para acceder al sistema. Si tu cuenta fue desactivada, contacta al administrador.',
			details:
				'Tu acceso al sistema ha sido restringido. Si tu cuenta fue desactivada o necesitas permisos adicionales, contacta al administrador.',
			variant: 'destructive',
		},
	}

	const message = messages[reason as keyof typeof messages] || messages.default

	const handleSignOut = async () => {
		if (isSigningOut) return // Prevenir múltiples clics

		setIsSigningOut(true)
		try {
			// Cerrar sesión sin redirección automática
			await signOut({
				callbackUrl: '/login',
				redirect: false,
			})
			// Forzar navegación completa a login para evitar que el middleware intercepte
			// Usar setTimeout para asegurar que la sesión se haya limpiado
			setTimeout(() => {
				window.location.href = '/login'
			}, 100)
		} catch (error) {
			console.error('Error al cerrar sesión:', error)
			// Si falla el signOut, forzar redirección de todas formas
			setTimeout(() => {
				window.location.href = '/login'
			}, 100)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
			<Card className="w-full max-w-2xl">
				<CardHeader className="text-center">
					<div className="mx-auto mb-6 flex flex-col items-center gap-4">
						{/* Logo de Financiera */}
						<div className="flex items-center justify-center">
							<Image
								src="/logos/logo-financiera.svg"
								alt="Financiera mente"
								width={200}
								height={50}
								className="h-auto w-auto"
								priority
							/>
						</div>
						{/* Icono */}
						<div
							className={`flex h-16 w-16 items-center justify-center rounded-full ${message.variant === 'default' ? 'bg-primary/10' : 'bg-destructive/10'}`}
						>
							{message.variant === 'default' ? (
								<CheckCircle2 className="h-8 w-8 text-primary" />
							) : (
								<AlertCircle className="h-8 w-8 text-destructive" />
							)}
						</div>
					</div>
					<CardTitle className="text-2xl">{message.title}</CardTitle>
					<CardDescription className="text-base mt-2">
						{message.description}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<Alert
						variant={message.variant === 'default' ? 'default' : 'destructive'}
					>
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>Información Importante</AlertTitle>
						<AlertDescription>{message.details}</AlertDescription>
					</Alert>

					<div className="flex flex-col gap-3">
						{/* Botón único */}
						<Button
							onClick={handleSignOut}
							variant={
								message.variant === 'default' ? 'default' : 'destructive'
							}
							className="w-full"
							disabled={isSigningOut}
						>
							<LogOut className="mr-2 h-4 w-4" />
							{isSigningOut
								? 'Cerrando sesión...'
								: message.variant === 'default'
									? 'Cerrar Sesión y Volver al Login'
									: 'Cerrar Sesión'}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

/**
 * Página de Acceso Denegado
 *
 * Se muestra cuando:
 * - Usuario está inactivo
 * - Usuario tiene rol DEFAULT (pendiente de activación)
 * - Usuario no tiene permisos para acceder
 */
export default function AccessDeniedPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center p-4">
					<Card className="w-full max-w-2xl">
						<CardContent className="p-6">
							<div className="text-center">Cargando...</div>
						</CardContent>
					</Card>
				</div>
			}
		>
			<AccessDeniedContent />
		</Suspense>
	)
}
