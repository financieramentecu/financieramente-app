import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { SetPasswordScreen } from '@/features/auth/components/account/set-password-screen'
import { getTrustedClientIp } from '@/features/auth/lib/trusted-client-ip'
import { resolveAccountLinkValidity } from '@/features/auth/services/account-link-preview.service'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
	title: 'Restablece tu contraseña - Financieramente',
	// The link carries a one-time token: keep the page out of indexes and referrers.
	robots: { index: false, follow: false },
	referrer: 'no-referrer',
}

interface PageProps {
	searchParams: Promise<{ token?: string | string[] }>
}

export default async function Page({ searchParams }: PageProps) {
	const { token } = await searchParams
	const rawToken = (Array.isArray(token) ? token[0] : token) ?? null
	const requestHeaders = await headers()
	const linkValid = await resolveAccountLinkValidity({
		scope: 'reset-password',
		rawToken,
		clientIp: getTrustedClientIp(requestHeaders),
	})
	// An invalid link never ships the token to the client.
	return (
		<SetPasswordScreen
			mode="reset"
			token={linkValid ? rawToken : null}
			linkValid={linkValid}
		/>
	)
}
