import { sendPartnerActivationEmail } from '@/features/email/lib/partner-activation-notification'

/**
 * Sends the activation link to a partner. Never throws and never logs the
 * token: a delivery problem is reported as `false` so the caller can answer
 * `emailSent: false` without rolling anything back.
 */
export async function sendPartnerActivationLink(
	partner: { name: string; email: string },
	rawToken: string
): Promise<boolean> {
	try {
		const result = await sendPartnerActivationEmail({
			userName: partner.name,
			userEmail: partner.email,
			rawToken,
		})
		return result.success
	} catch {
		console.error('Error sending partner activation email')
		return false
	}
}
