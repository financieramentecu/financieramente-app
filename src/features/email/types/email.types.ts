/**
 * Tipos para el feature de email
 */

export interface EmailResult {
	success: boolean
	messageId?: string
	error?: string
	statusCode?: number
}

export interface SendEmailParams {
	to: string
	from?: string
	subject: string
	text?: string
	html?: string
}

export interface SendTemplatedEmailParams {
	to: string
	from?: string
	templateId: string
	dynamicTemplateData?: Record<string, unknown>
}
