import {
	IEmailRepository,
	EmailResult,
} from '@/domain/email/repositories/IEmailRepository'
import { EmailAddress } from '@/domain/email/value-objects/EmailAddress'
import { SendTemplatedEmailDTO } from '../dto/EmailDTO'

/**
 * Caso de uso: Enviar email con template dinámico
 *
 * Encapsula la lógica de negocio para enviar un email usando
 * un template dinámico de SendGrid.
 */
export class SendTemplatedEmailUseCase {
	constructor(private readonly emailRepository: IEmailRepository) {}

	/**
	 * Ejecuta el caso de uso
	 */
	async execute(dto: SendTemplatedEmailDTO): Promise<EmailResult> {
		// Validar y crear Value Object para el email de destino
		const toEmailResult = EmailAddress.create(dto.to)
		if (toEmailResult instanceof Error) {
			return {
				success: false,
				error: `Email de destino inválido: ${toEmailResult.message}`,
			}
		}

		// Validar template ID
		if (!dto.templateId || !dto.templateId.match(/^d-[a-f0-9]{32}$/i)) {
			return {
				success: false,
				error: 'El template ID no tiene un formato válido de SendGrid',
			}
		}

		// Validar que dynamicTemplateData sea un objeto
		const dynamicData = dto.dynamicTemplateData || {}

		// Ejecutar el envío
		try {
			const result = await this.emailRepository.sendTemplated(
				dto.templateId,
				toEmailResult,
				dynamicData
			)

			return result
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al enviar email',
			}
		}
	}
}
