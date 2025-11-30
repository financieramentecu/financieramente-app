'use client'

import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/features/shared/ui/alert'

interface ErrorMessageProps {
	error?: string | null
}

/**
 * Componente para mostrar mensajes de error de autenticación
 */
export function ErrorMessage({ error }: ErrorMessageProps) {
	if (!error) {
		return null
	}

	const errorMessages: Record<string, { title: string; description: string }> =
	{
		AccountDisabled: {
			title: '⛔ Cuenta Desactivada',
			description:
				'Cuenta Desactivada. Debes solicitar la activación, contacta al administrador.',
		},
		AccessDenied: {
			title: 'Acceso Denegado',
			description:
				'No tienes permisos para acceder al sistema. Si tu cuenta fue desactivada, contacta al administrador.',
		},
		Configuration: {
			title: 'Error de Configuración',
			description: 'Hubo un problema con la configuración del servidor.',
		},
		OAuthAccountNotLinked: {
			title: 'Cuenta No Encontrada',
			description:
				'Tu cuenta de Google no está registrada en el sistema. Contacta al administrador.',
		},
		InvalidDomain: {
			title: 'Dominio No Autorizado',
			description:
				'Solo se permite el acceso con correos corporativos (@financieramentecu.com). Por favor, utiliza tu cuenta institucional.',
		},
		Default: {
			title: 'Error de Autenticación',
			description:
				'Ocurrió un error al intentar iniciar sesión. Por favor, intenta nuevamente.',
		},
	}

	const errorInfo = errorMessages[error] || errorMessages.Default

	return (
		<Alert variant="destructive" className="mb-4">
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>{errorInfo.title}</AlertTitle>
			<AlertDescription>{errorInfo.description}</AlertDescription>
		</Alert>
	)
}
