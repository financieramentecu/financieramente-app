import { EmailAddress } from '../value-objects/EmailAddress'
import { EmailSubject } from '../value-objects/EmailSubject'
import { EmailTemplate } from '../value-objects/EmailTemplate'

/**
 * Enum: Estado del email
 */
export enum EmailStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DELIVERED = 'DELIVERED',
  BOUNCED = 'BOUNCED',
}

/**
 * Entidad: Email
 * 
 * Representa un correo electrónico en el dominio.
 * Puede ser un email con template dinámico o un email tradicional.
 */
export class Email {
  constructor(
    public readonly id: string,
    public readonly to: EmailAddress,
    public readonly from: EmailAddress,
    public readonly subject?: EmailSubject,
    public readonly template?: EmailTemplate,
    public readonly plainText?: string,
    public readonly html?: string,
    public readonly status: EmailStatus = EmailStatus.PENDING,
    public readonly createdAt: Date = new Date()
  ) {
    // Validación: debe tener template O contenido (text/html)
    if (!template && !plainText && !html) {
      throw new Error('El email debe tener un template o contenido (text/html)')
    }

    // Validación: si tiene template, no debe tener subject (lo maneja el template)
    if (template && subject) {
      throw new Error('Un email con template no debe tener subject definido')
    }

    // Validación: si no tiene template, debe tener subject
    if (!template && !subject) {
      throw new Error('Un email sin template debe tener un subject')
    }
  }

  /**
   * Crea un email con template dinámico
   */
  static createTemplated(
    id: string,
    to: EmailAddress,
    from: EmailAddress,
    template: EmailTemplate
  ): Email {
    return new Email(id, to, from, undefined, template)
  }

  /**
   * Crea un email tradicional (sin template)
   */
  static createTraditional(
    id: string,
    to: EmailAddress,
    from: EmailAddress,
    subject: EmailSubject,
    plainText?: string,
    html?: string
  ): Email {
    return new Email(id, to, from, subject, undefined, plainText, html)
  }

  /**
   * Marca el email como enviado
   */
  markAsSent(): Email {
    return new Email(
      this.id,
      this.to,
      this.from,
      this.subject,
      this.template,
      this.plainText,
      this.html,
      EmailStatus.SENT,
      this.createdAt
    )
  }

  /**
   * Marca el email como fallido
   */
  markAsFailed(): Email {
    return new Email(
      this.id,
      this.to,
      this.from,
      this.subject,
      this.template,
      this.plainText,
      this.html,
      EmailStatus.FAILED,
      this.createdAt
    )
  }
}

