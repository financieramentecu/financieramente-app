import { NextResponse } from 'next/server'
import { SendTemplatedEmailUseCase } from '@/application/email/use-cases/SendTemplatedEmailUseCase'
import { SendEmailUseCase } from '@/application/email/use-cases/SendEmailUseCase'
import { SendGridEmailService } from '@/infrastructure/email/sendgrid/SendGridEmailService'
import {
  type SendTemplatedEmailDTO,
  type SendEmailDTO,
} from '@/application/email/dto/EmailDTO'

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

    // Validar que tenga el campo "type"
    if (!body.type || typeof body.type !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'El campo "type" es requerido y debe ser "templated" o "traditional"',
        },
        { status: 400 }
      )
    }

    // Instanciar servicios
    const emailService = new SendGridEmailService()

    // Procesar según el tipo
    if (body.type === 'templated') {
      // Validación manual básica
      if (!body.to || typeof body.to !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'El campo "to" es requerido y debe ser un email válido',
          },
          { status: 400 }
        )
      }

      if (!body.templateId || typeof body.templateId !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'El campo "templateId" es requerido',
          },
          { status: 400 }
        )
      }

      if (!body.dynamicTemplateData || typeof body.dynamicTemplateData !== 'object') {
        return NextResponse.json(
          {
            success: false,
            error: 'El campo "dynamicTemplateData" es requerido y debe ser un objeto',
          },
          { status: 400 }
        )
      }

      // Ejecutar caso de uso (el caso de uso tiene su propia validación)
      const useCase = new SendTemplatedEmailUseCase(emailService)
      const result = await useCase.execute({
        to: body.to,
        from: body.from,
        templateId: body.templateId,
        dynamicTemplateData: body.dynamicTemplateData,
      } as SendTemplatedEmailDTO)

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
      // Validación manual básica
      if (!body.to || typeof body.to !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'El campo "to" es requerido y debe ser un email válido',
          },
          { status: 400 }
        )
      }

      if (!body.subject || typeof body.subject !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'El campo "subject" es requerido',
          },
          { status: 400 }
        )
      }

      if (!body.text && !body.html) {
        return NextResponse.json(
          {
            success: false,
            error: 'Debe proporcionar al menos "text" o "html"',
          },
          { status: 400 }
        )
      }

      // Ejecutar caso de uso
      const useCase = new SendEmailUseCase(emailService)
      const result = await useCase.execute({
        to: body.to,
        from: body.from,
        subject: body.subject,
        text: body.text,
        html: body.html,
      } as SendEmailDTO)

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
