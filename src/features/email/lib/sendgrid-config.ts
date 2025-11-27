/**
 * Configuración de SendGrid
 *
 * Centraliza la configuración y validación de variables de entorno
 * relacionadas con SendGrid.
 */
export class SendGridConfig {
	private static readonly REQUIRED_ENV_VARS = [
		'SENDGRID_API_KEY',
		'SENDGRID_FROM_EMAIL',
	] as const

	/**
	 * Valida que todas las variables de entorno requeridas estén configuradas
	 */
	static validate(): void {
		const missing: string[] = []

		for (const envVar of this.REQUIRED_ENV_VARS) {
			if (!process.env[envVar]) {
				missing.push(envVar)
			}
		}

		if (missing.length > 0) {
			throw new Error(
				`Variables de entorno faltantes para SendGrid: ${missing.join(', ')}\n` +
					'Por favor, configura estas variables en tu archivo .env.local'
			)
		}
	}

	/**
	 * Obtiene la API Key de SendGrid
	 */
	static getApiKey(): string {
		const apiKey = process.env.SENDGRID_API_KEY
		if (!apiKey) {
			throw new Error('SENDGRID_API_KEY no está configurada')
		}
		return apiKey
	}

	/**
	 * Obtiene el email de origen por defecto
	 */
	static getFromEmail(): string {
		const fromEmail = process.env.SENDGRID_FROM_EMAIL
		if (!fromEmail) {
			throw new Error('SENDGRID_FROM_EMAIL no está configurada')
		}
		return fromEmail
	}

	/**
	 * Obtiene el nombre de origen por defecto
	 */
	static getFromName(): string {
		return process.env.SENDGRID_FROM_NAME || 'Financieramente'
	}

	/**
	 * Obtiene el template ID por defecto (opcional)
	 */
	static getDefaultTemplateId(): string | undefined {
		return process.env.SENDGRID_TEMPLATE_ID
	}
}
