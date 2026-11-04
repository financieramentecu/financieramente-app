import type { PartnerDto } from '../types/partner.types'
import { sendPartnerActivationLink } from './partner-notification.service'

/**
 * Best-effort delivery used right after a commit: any failure (a `false`
 * result or a thrown error) becomes `emailSent: false` and never propagates,
 * so the already-committed creation or token is never rolled back.
 */
export async function deliverActivationLink(
	partner: Pick<PartnerDto, 'name' | 'email'>,
	rawToken: string
): Promise<boolean> {
	try {
		return await sendPartnerActivationLink(
			{ name: partner.name, email: partner.email },
			rawToken
		)
	} catch {
		console.error('Error delivering partner activation link')
		return false
	}
}
