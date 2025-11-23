import sgMail from '@sendgrid/mail'
import {
	IEmailRepository,
	EmailResult,
} from '@/domain/email/repositories/IEmailRepository'
import { Email } from '@/domain/email/entities/Email'
import { EmailAddress } from '@/domain/email/value-objects/EmailAddress'
import { SendGridConfig } from './SendGridConfig'

/**
 * Servicio de email usando SendGrid
 *
 * Implementación concreta de IEmailRepository usando la librería
 * oficial de SendGrid (@sendgrid/mail).
 */
export class SendGridEmailService implements IEmailRepository {
	private initialized = false

	/**
	 * Inicializa el cliente de SendGrid
	 */
	private initialize(): void {
		if (this.initialized) {
			return
		}

		try {
			SendGridConfig.validate()
			const apiKey = SendGridConfig.getApiKey()
			sgMail.setApiKey(apiKey)
			this.initialized = true
		} catch (error) {
			throw new Error(
				`Error al inicializar SendGrid: ${error instanceof Error ? error.message : 'Error desconocido'}`
			)
		}
	}

	/**
	 * Envía un email (genérico)
	 */
	async send(email: Email): Promise<EmailResult> {
		this.initialize()

		try {
			// Si tiene template, usar sendTemplated
			if (email.template) {
				return await this.sendTemplated(
					email.template.templateId,
					email.to,
					email.template.dynamicData
				)
			}

			// Si no tiene template, enviar email tradicional
			// SendGrid requiere al menos un elemento en content
			if (!email.plainText && !email.html) {
				return {
					success: false,
					error: 'El email debe tener contenido (texto plano o HTML)',
				}
			}

			const content: Array<{ type: string; value: string }> = []
			if (email.plainText) {
				content.push({ type: 'text/plain', value: email.plainText })
			}
			if (email.html) {
				content.push({ type: 'text/html', value: email.html })
			}

			const msg = {
				to: email.to.getValue(),
				from: {
					email: email.from.getValue(),
					name: SendGridConfig.getFromName(),
				},
				subject: email.subject?.getValue() || '',
				content: content as [(typeof content)[0], ...(typeof content)[]],
			}

			const [response] = await sgMail.send(
				msg as Parameters<typeof sgMail.send>[0]
			)

			return {
				success: true,
				messageId: response.headers['x-message-id'] as string | undefined,
				statusCode: response.statusCode,
			}
		} catch (error: unknown) {
			return this.handleError(error)
		}
	}

	/**
	 * Envía un email usando un template dinámico de SendGrid
	 */
	async sendTemplated(
		templateId: string,
		to: EmailAddress,
		dynamicData: Record<string, unknown>
	): Promise<EmailResult> {
		this.initialize()

		try {
			const fromEmail = SendGridConfig.getFromEmail()
			const fromName = SendGridConfig.getFromName()

			const msg = {
				to: to.getValue(),
				from: {
					email: fromEmail,
					name: fromName,
				},
				templateId,
				dynamicTemplateData: dynamicData,
			}

			const [response] = await sgMail.send(msg)

			return {
				success: true,
				messageId: response.headers['x-message-id'] as string | undefined,
				statusCode: response.statusCode,
			}
		} catch (error: unknown) {
			return this.handleError(error)
		}
	}

	/**
	 * Maneja errores de SendGrid y los convierte a EmailResult
	 */
	private handleError(error: unknown): EmailResult {
		if (error && typeof error === 'object' && 'response' in error) {
			const sendGridError = error as {
				response?: {
					body?: {
						errors?: Array<{ message?: string; field?: string }>
					}
					statusCode?: number
				}
			}

			const errors = sendGridError.response?.body?.errors || []
			const errorMessage = errors
				.map(
					(e) => `${e.field || 'Error'}: ${e.message || 'Error desconocido'}`
				)
				.join(', ')

			return {
				success: false,
				error: errorMessage || 'Error al enviar email con SendGrid',
				statusCode: sendGridError.response?.statusCode,
			}
		}

		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Error desconocido al enviar email',
		}
	}
}
