/**
 * Value Object: EmailSubject
 * 
 * Encapsula el asunto de un correo electrónico con validación.
 */
export class EmailSubject {
  private static readonly MIN_LENGTH = 1
  private static readonly MAX_LENGTH = 200

  private constructor(private readonly value: string) {}

  /**
   * Crea una instancia válida de EmailSubject
   * @param subject Asunto del correo
   * @returns EmailSubject si es válido, Error si no lo es
   */
  static create(subject: string): EmailSubject | Error {
    if (!subject || typeof subject !== 'string') {
      return new Error('El asunto es requerido y debe ser una cadena de texto')
    }

    const trimmedSubject = subject.trim()

    if (trimmedSubject.length < this.MIN_LENGTH) {
      return new Error(`El asunto debe tener al menos ${this.MIN_LENGTH} carácter`)
    }

    if (trimmedSubject.length > this.MAX_LENGTH) {
      return new Error(`El asunto no puede exceder ${this.MAX_LENGTH} caracteres`)
    }

    return new EmailSubject(trimmedSubject)
  }

  /**
   * Obtiene el valor del asunto
   */
  getValue(): string {
    return this.value
  }

  /**
   * Representación en string
   */
  toString(): string {
    return this.value
  }
}

