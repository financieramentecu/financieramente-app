import Image from 'next/image'

import { cn } from '@/lib/utils'

const BRAND_LOGO_SRC = {
	'on-light': '/brand/logo-on-light.svg',
	'on-dark': '/brand/logo-on-dark.svg',
	'on-color': '/brand/logo-on-color.svg',
	mark: '/brand/isotipo.svg',
	'mark-white': '/brand/isotipo-white.svg',
} as const

export type BrandLogoVariant = keyof typeof BRAND_LOGO_SRC

interface BrandLogoProps {
	variant: BrandLogoVariant
	className?: string
	priority?: boolean
}

export function BrandLogo({ variant, className, priority = false }: BrandLogoProps) {
	const isMark = variant === 'mark' || variant === 'mark-white'

	return (
		<Image
			src={BRAND_LOGO_SRC[variant]}
			alt="Financieramente"
			width={isMark ? 64 : 280}
			height={isMark ? 64 : 48}
			priority={priority}
			className={cn('h-auto w-auto max-w-full object-contain', className)}
		/>
	)
}
