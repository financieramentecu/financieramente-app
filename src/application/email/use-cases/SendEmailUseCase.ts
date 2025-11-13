import { IEmailRepository, EmailResult } from '@/domain/email/repositories/IEmailRepository'
import { Email } from '@/domain/email/entities/Email'
import { EmailAddress } from '@/domain/email/value-objects/EmailAddress'
import { EmailSubject } from '@/domain/email/value-objects/EmailSubject'
import { SendEmailDTO } from '../dto/EmailDTO'
import { randomUUID } from 'crypto'

/**
 * Caso de uso: Enviar email tradicional (sin template)
 * 
 * Encapsula la lógica de negocio para enviar un email tradicional
 * con texto plano o HTML.
 */
export class SendEmailUseCase {
  constructor(private readonly emailRepository: IEmailRepository) {}

  /**
   * Ejecuta el caso de uso
   */
  async execute(dto: SendEmailDTO): Promise<EmailResult> {
    // Validar y crear Value Objects
    const toEmailResult = EmailAddress.create(dto.to)
    if (toEmailResult instanceof Error) {
      return {
        success: false,
        error: `Email de destino inválido: ${toEmailResult.message}`,
      }
    }

    const fromEmail = dto.from
      ? EmailAddress.create(dto.from)
      : EmailAddress.create(process.env.SENDGRID_FROM_EMAIL || 'noreply@financieramente.com')

    if (fromEmail instanceof Error) {
      return {
        success: false,
        error: `Email de origen inválido: ${fromEmail.message}`,
      }
    }

    const subjectResult = EmailSubject.create(dto.subject)
    if (subjectResult instanceof Error) {
      return {
        success: false,
        error: `Asunto inválido: ${subjectResult.message}`,
      }
    }

    // Validar que tenga contenido
    if (!dto.text && !dto.html) {
      return {
        success: false,
        error: 'Debe proporcionar al menos texto plano o HTML',
      }
    }

    // Crear entidad Email
    const email = Email.createTraditional(
      randomUUID(),
      toEmailResult,
      fromEmail,
      subjectResult,
      dto.text,
      dto.html
    )

    // Ejecutar el envío
    try {
      const result = await this.emailRepository.send(email)
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al enviar email',
      }
    }
  }
}

