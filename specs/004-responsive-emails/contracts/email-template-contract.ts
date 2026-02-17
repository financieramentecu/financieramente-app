/**
 * Contrato para plantilla de correos de notificación.
 * Implementación en src/features/email/lib/email-template-base.ts
 */

/** Opciones para construir un correo con estructura unificada */
export interface EmailTemplateOptions {
	readonly title: string
	readonly subtitle?: string
	readonly logoUrl?: string
	readonly content: string
	readonly showLogoImage?: boolean
}

/** Tokens de diseño unificados para correos */
export const EMAIL_DESIGN_TOKENS = {
	primary: '#00505C',
	primaryHover: '#003d47',
	accent: '#83D874',
	textPrimary: '#1a1a1a',
	textSecondary: '#333333',
	textMuted: '#666666',
	bgBody: '#f5f5f5',
	bgCard: '#ffffff',
	bgMuted: '#f8f9fa',
	borderMuted: '#e9ecef',
	maxWidth: '600px',
} as const

/** Estructura HTML esperada: header, content, footer */
export type EmailStructure = 'header' | 'content' | 'footer'
