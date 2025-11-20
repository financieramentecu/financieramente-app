'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Componente de botón de logout
 *
 * Permite cerrar sesión de forma segura
 */
interface LogoutButtonProps {
	variant?:
		| 'default'
		| 'destructive'
		| 'outline'
		| 'secondary'
		| 'ghost'
		| 'link'
	className?: string
}

export function LogoutButton({
	variant = 'outline',
	className,
}: LogoutButtonProps) {
	const handleLogout = async () => {
		try {
			await signOut({
				callbackUrl: '/login',
				redirect: true,
			})
			toast.success('Sesión cerrada', {
				description: 'Has cerrado sesión correctamente.',
			})
		} catch (error) {
			console.error('Error al cerrar sesión:', error)
			toast.error('Error al cerrar sesión', {
				description: 'Ocurrió un error al intentar cerrar sesión.',
			})
		}
	}

	return (
		<Button variant={variant} onClick={handleLogout} className={className}>
			<LogOut className="mr-2 h-4 w-4" />
			Cerrar Sesión
		</Button>
	)
}
