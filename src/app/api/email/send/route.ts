import { NextResponse } from 'next/server'
import { SendTemplatedEmailUseCase } from '@/application/email/use-cases/SendTemplatedEmailUseCase'
import { SendEmailUseCase } from '@/application/email/use-cases/SendEmailUseCase'
import { SendGridEmailService } from '@/infrastructure/email/sendgrid/SendGridEmailService'
import {
  type SendTemplatedEmailDTO,
  type SendEmailDTO,
  sendTemplatedEmailSchema,
  sendEmailSchema,
} from '@/application/email/dto/EmailDTO'
import { z } from 'zod'

/**
 * POST /api/email/send
 * 
 * Endpoint para enviar correos electrónicos.
 * 
 * Soporta dos tipos de emails:
 * 1. Email con template dinámico de SendGrid
 * 2. Email tradicional (texto plano o HTML)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validar el tipo de email
    const typeSchema = z.object({
      type: z.enum(['templated', 'traditional'], {
        message: 'El campo "type" es requerido y debe ser "templated" o "traditional"',
      }),
    })

    const typeValidation = typeSchema.safeParse(body)
    if (!typeValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: typeValidation.error.issues[0]?.message || 'El campo "type" es requerido y debe ser "templated" o "traditional"',
        },
        { status: 400 }
      )
    }

    // Instanciar servicios
    const emailService = new SendGridEmailService()

    // Procesar según el tipo
    if (body.type === 'templated') {
      // Validar con Zod
      const validation = sendTemplatedEmailSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: validation.error.issues[0]?.message || 'Error de validación',
            errors: validation.error.issues,
          },
          { status: 400 }
        )
      }

      // Ejecutar caso de uso
      const useCase = new SendTemplatedEmailUseCase(emailService)
      const result = await useCase.execute(validation.data as SendTemplatedEmailDTO)

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Error al enviar email',
            statusCode: result.statusCode,
          },
          { status: result.statusCode && result.statusCode < 500 ? result.statusCode : 500 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          messageId: result.messageId,
          message: 'Email enviado exitosamente',
        },
        { status: 200 }
      )
    }

    if (body.type === 'traditional') {
      // Validar con Zod
      const validation = sendEmailSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: validation.error.issues[0]?.message || 'Error de validación',
            errors: validation.error.issues,
          },
          { status: 400 }
        )
      }

      // Ejecutar caso de uso
      const useCase = new SendEmailUseCase(emailService)
      const result = await useCase.execute(validation.data as SendEmailDTO)

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Error al enviar email',
            statusCode: result.statusCode,
          },
          { status: result.statusCode && result.statusCode < 500 ? result.statusCode : 500 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          messageId: result.messageId,
          message: 'Email enviado exitosamente',
        },
        { status: 200 }
      )
    }

    // Este bloque nunca debería ejecutarse si la validación del tipo es correcta
    // pero lo dejamos como fallback por seguridad
    return NextResponse.json(
      {
        success: false,
        error: 'El tipo debe ser "templated" o "traditional"',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error en /api/email/send:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
