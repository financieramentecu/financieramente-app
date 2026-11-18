import nodemailer from 'nodemailer'
import type { EmailResult, SendEmailParams } from '@/features/email/types/email.types'

export interface DevEmailResult extends EmailResult {
	previewUrl?: string
}

let testAccount: nodemailer.TestAccount | null = null

async function etherealAccount(): Promise<nodemailer.TestAccount> {
	if (!testAccount) testAccount = await nodemailer.createTestAccount()
	return testAccount
}

/**
 * Free inbox for local previews. Used only when SendGrid is not configured.
 * The message never leaves Ethereal; `previewUrl` opens it in the browser.
 */
export async function sendDevEtherealEmail(params: SendEmailParams): Promise<DevEmailResult> {
	const account = await etherealAccount()
	const transport = nodemailer.createTransport({
		host: account.smtp.host,
		port: account.smtp.port,
		secure: account.smtp.secure,
		auth: { user: account.user, pass: account.pass },
	})
	const info = await transport.sendMail({
		from: params.from ?? 'Financieramente <preview@ethereal.email>',
		to: params.to,
		subject: params.subject,
		text: params.text,
		html: params.html,
	})
	const preview = nodemailer.getTestMessageUrl(info)
	const previewUrl = typeof preview === 'string' ? preview : undefined
	if (previewUrl) console.info(`[email-preview] ${params.to} ${previewUrl}`)
	return { success: true, messageId: info.messageId, previewUrl }
}
