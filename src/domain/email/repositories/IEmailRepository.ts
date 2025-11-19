import { Email } from '../entities/Email'
import { EmailAddress } from '../value-objects/EmailAddress'

/**
 * Resultado de una operación de envío de email
 */
export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  statusCode?: number
}

/**
 * Interface del repositorio de emails
 * 
 * Define el contrato que debe cumplir cualquier implementación
 * del servicio de envío de emails (SendGrid, SMTP, etc.)
 */
export interface IEmailRepository {
  /**
   * Envía un email (con o sin template)
   */
  send(email: Email): Promise<EmailResult>

  /**
   * Envía un email usando un template dinámico de SendGrid
   * 
   * @param templateId ID del template de SendGrid (formato: d-xxxxxxxxx)
   * @param to Dirección de destino
   * @param dynamicData Datos dinámicos para el template
   * @returns Resultado de la operación
   */
  sendTemplated(
    templateId: string,
    to: EmailAddress,
    dynamicData: Record<string, unknown>
  ): Promise<EmailResult>
}

