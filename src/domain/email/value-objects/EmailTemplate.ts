/**
 * Value Object: EmailTemplate
 * 
 * Encapsula la información de un template dinámico de SendGrid.
 */
export class EmailTemplate {
  private static readonly TEMPLATE_ID_REGEX = /^d-[a-f0-9]{32}$/i

  constructor(
    public readonly templateId: string,
    public readonly dynamicData: Record<string, unknown>
  ) {
    if (!this.isValidTemplateId(templateId)) {
      throw new Error('El template ID no tiene un formato válido de SendGrid')
    }
  }

  /**
   * Valida el formato del template ID de SendGrid
   */
  private isValidTemplateId(templateId: string): boolean {
    return this.TEMPLATE_ID_REGEX.test(templateId)
  }

  /**
   * Crea una instancia de EmailTemplate
   */
  static create(
    templateId: string,
    dynamicData: Record<string, unknown>
  ): EmailTemplate | Error {
    try {
      return new EmailTemplate(templateId, dynamicData)
    } catch (error) {
      return error instanceof Error ? error : new Error('Error al crear EmailTemplate')
    }
  }
}

