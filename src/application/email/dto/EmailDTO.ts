import { z } from 'zod'

/**
 * Schema para validar request de email con template
 */
export const sendTemplatedEmailSchema = z.object({
  to: z.string().email('El email de destino no es válido'),
  from: z.string().email('El email de origen no es válido').optional(),
  templateId: z.string().regex(/^d-[a-f0-9]{32}$/i, 'El template ID no tiene un formato válido'),
  dynamicTemplateData: z.record(z.string(), z.any()).default({}),
})

/**
 * Schema para validar request de email tradicional
 */
export const sendEmailSchema = z.object({
  to: z.string().email('El email de destino no es válido'),
  from: z.string().email('El email de origen no es válido').optional(),
  subject: z.string().min(1).max(200),
  text: z.string().optional(),
  html: z.string().optional(),
}).refine(
  (data) => data.text || data.html,
  {
    message: 'Debe proporcionar al menos texto plano o HTML',
    path: ['text'],
  }
)

/**
 * DTO para enviar email con template dinámico
 */
export type SendTemplatedEmailDTO = z.infer<typeof sendTemplatedEmailSchema>

/**
 * DTO para enviar email tradicional
 */
export type SendEmailDTO = z.infer<typeof sendEmailSchema>

