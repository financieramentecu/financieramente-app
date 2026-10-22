import type { ReactNode } from 'react'
import { AuthCard } from '../login/auth-card'
import { BrandPanel } from '../login/brand-panel'

interface AuthPageShellProps {
	children: ReactNode
}

/** Same split layout as the login page: brand panel + centered card. */
export function AuthPageShell({ children }: AuthPageShellProps) {
	return (
		<section className="grid min-h-screen bg-background text-foreground md:grid-cols-2">
			<BrandPanel
				footer="Financiera mente"
				graphicSrc="/brand/isotipo-white.svg"
				graphicAlt=""
				footerLogoSrc="/brand/logo-on-color.svg"
				footerLogoAlt="Financieramente"
			/>
			<div className="flex items-center justify-center px-6 py-12">
				<AuthCard
					title="Financiera"
					highlight="mente"
					logoSrc="/brand/logo-on-light.svg"
					logoAlt="Financieramente"
				>
					<div className="space-y-6">{children}</div>
				</AuthCard>
			</div>
		</section>
	)
}
