'use client'

/**
 * Avatar con iniciales para mostrar usuario/cliente
 */

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '@/features/shared/ui/avatar'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
	name: string
	imageUrl?: string | null
	size?: 'sm' | 'md' | 'lg'
	className?: string
}

/**
 * Obtiene las iniciales de un nombre
 */
function getInitials(name: string): string {
	const parts = name.trim().split(' ')
	if (parts.length === 1) {
		return parts[0].substring(0, 2).toUpperCase()
	}
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Genera un color de fondo basado en el nombre
 */
function getBackgroundColor(name: string): string {
	const colors = [
		'bg-blue-500',
		'bg-green-500',
		'bg-purple-500',
		'bg-orange-500',
		'bg-pink-500',
		'bg-teal-500',
		'bg-indigo-500',
		'bg-cyan-500',
	]

	let hash = 0
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash)
	}

	return colors[Math.abs(hash) % colors.length]
}

const SIZE_CLASSES = {
	sm: 'h-8 w-8 text-xs',
	md: 'h-10 w-10 text-sm',
	lg: 'h-12 w-12 text-base',
}

/**
 * Avatar con iniciales para usuarios
 *
 * @example
 * ```tsx
 * <UserAvatar name="María García" />
 * <UserAvatar name="Carlos Pérez" size="lg" />
 * ```
 */
export function UserAvatar({
	name,
	imageUrl,
	size = 'md',
	className,
}: UserAvatarProps) {
	const initials = getInitials(name)
	const bgColor = getBackgroundColor(name)

	return (
		<Avatar className={cn(SIZE_CLASSES[size], className)}>
			{imageUrl && <AvatarImage src={imageUrl} alt={name} />}
			<AvatarFallback className={cn(bgColor, 'text-white font-medium')}>
				{initials}
			</AvatarFallback>
		</Avatar>
	)
}
