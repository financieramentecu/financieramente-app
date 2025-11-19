import { SendEmailUseCase } from '@/application/email/use-cases/SendEmailUseCase'
import { SendGridEmailService } from '@/infrastructure/email/sendgrid/SendGridEmailService'

/**
 * Notifica al usuario que su cuenta ha sido creada y está pendiente de activación
 */
export async function notifyUserAccountCreated(params: {
  email: string
  name: string
}): Promise<void> {
  try {
    const emailService = new SendGridEmailService()
    const useCase = new SendEmailUseCase(emailService)

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0;">Bienvenido a Financieramente</h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #111827; margin-top: 0;">Hola ${params.name},</h2>
              
              <p>Tu cuenta ha sido creada exitosamente en el sistema de Liquidación Nacional.</p>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-weight: bold; color: #92400e;">
                  ⚠️ Tu cuenta está pendiente de activación
                </p>
                <p style="margin: 10px 0 0 0; color: #78350f;">
                  Para poder acceder al sistema, un administrador debe activar tu cuenta y asignarte los permisos correspondientes.
                </p>
              </div>
              
              <p>Una vez que tu cuenta sea activada, recibirás una notificación y podrás acceder al sistema utilizando tu cuenta de Google corporativa (@financieramentecu.com).</p>
              
              <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar al administrador del sistema.</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Este es un mensaje automático, por favor no respondas a este correo.
                </p>
              </div>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                © ${new Date().getFullYear()} Financieramente. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
Bienvenido a Financieramente

Hola ${params.name},

Tu cuenta ha sido creada exitosamente en el sistema de Liquidación Nacional.

⚠️ IMPORTANTE: Tu cuenta está pendiente de activación

Para poder acceder al sistema, un administrador debe activar tu cuenta y asignarte los permisos correspondientes.

Una vez que tu cuenta sea activada, recibirás una notificación y podrás acceder al sistema utilizando tu cuenta de Google corporativa (@financieramentecu.com).

Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar al administrador del sistema.

---
Este es un mensaje automático, por favor no respondas a este correo.
© ${new Date().getFullYear()} Financieramente. Todos los derechos reservados.
    `.trim()

    await useCase.execute({
      to: params.email,
      subject: 'Cuenta creada - Pendiente de activación | Financieramente',
      html,
      text,
    })
  } catch (error) {
    // No lanzar error para no interrumpir el flujo de creación de usuario
    // Solo registrar en consola para debugging
    console.error('Error enviando email de notificación de cuenta creada:', error)
  }
}

/**
 * Notifica al administrador que hay un nuevo usuario pendiente de activación
 */
export async function notifyAdminNewUser(params: {
  userEmail: string
  userName: string
  userId: number
}): Promise<void> {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'admin@financieramentecu.com'
    
    const emailService = new SendGridEmailService()
    const useCase = new SendEmailUseCase(emailService)

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #3b82f6; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0;">Nuevo Usuario Registrado</h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
              <p>Se ha registrado un nuevo usuario en el sistema que requiere activación:</p>
              
              <div style="background-color: white; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 4px;">
                <p style="margin: 0;"><strong>Nombre:</strong> ${params.userName}</p>
                <p style="margin: 10px 0 0 0;"><strong>Email:</strong> ${params.userEmail}</p>
                <p style="margin: 10px 0 0 0;"><strong>ID de Usuario:</strong> ${params.userId}</p>
              </div>
              
              <p>El usuario ha sido creado con:</p>
              <ul style="margin: 10px 0;">
                <li>Estado: <strong>Inactivo</strong></li>
                <li>Rol: <strong>Default</strong> (pendiente de asignación)</li>
              </ul>
              
              <p>Por favor, accede al panel de administración para activar la cuenta y asignar los permisos correspondientes.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
Nuevo Usuario Registrado

Se ha registrado un nuevo usuario en el sistema que requiere activación:

Nombre: ${params.userName}
Email: ${params.userEmail}
ID de Usuario: ${params.userId}

El usuario ha sido creado con:
- Estado: Inactivo
- Rol: Default (pendiente de asignación)

Por favor, accede al panel de administración para activar la cuenta y asignar los permisos correspondientes.
    `.trim()

    await useCase.execute({
      to: adminEmail,
      subject: `Nuevo usuario registrado: ${params.userName} | Sistema de Liquidación Nacional`,
      html,
      text,
    })
  } catch (error) {
    // No lanzar error para no interrumpir el flujo de creación de usuario
    // Solo registrar en consola para debugging
    console.error('Error enviando email de notificación a administrador:', error)
  }
}

