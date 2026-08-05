import { Avatar, AvatarFallback } from '@/features/shared/ui/avatar'
import { cn } from '@/lib/utils'

interface LeadOwnerAvatarProps {
	name: string
	size?: 'sm' | 'md'
	className?: string
}

const SIZE_CLASSES = {
	sm: 'h-6 w-6 text-[10px]',
	md: 'h-8 w-8 text-xs',
}

const BACKGROUND_COLORS = [
	'bg-blue-500',
	'bg-green-500',
	'bg-purple-500',
	'bg-orange-500',
	'bg-pink-500',
	'bg-teal-500',
	'bg-indigo-500',
	'bg-cyan-500',
]

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/)
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getBackgroundColor(name: string): string {
	let hash = 0
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash)
	}
	return BACKGROUND_COLORS[Math.abs(hash) % BACKGROUND_COLORS.length]
}

/**
 * Small initials avatar for a lead's assigned owner (`Lead.ownerName`).
 * Local to `leads` — mirrors `negocios/components/ui/UserAvatar` without a
 * cross-feature import (each feature owns its own presentational bits).
 */
export function LeadOwnerAvatar({ name, size = 'sm', className }: LeadOwnerAvatarProps) {
	return (
		<Avatar className={cn(SIZE_CLASSES[size], className)}>
			<AvatarFallback className={cn(getBackgroundColor(name), 'font-medium text-white')}>
				{getInitials(name)}
			</AvatarFallback>
		</Avatar>
	)
}
