import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SendGridEmailService } from '../sendgrid/SendGridEmailService'
import { EmailAddress } from '@/domain/email/value-objects/EmailAddress'
import { EmailSubject } from '@/domain/email/value-objects/EmailSubject'
import { Email } from '@/domain/email/entities/Email'
import { randomUUID } from 'crypto'

/**
 * Tests de integración para SendGridEmailService
 *
 * Estos tests verifican la integración con SendGrid usando mocks
 * para evitar enviar emails reales durante las pruebas.
 */

// Mock de @sendgrid/mail
vi.mock('@sendgrid/mail', () => {
    const mockSend = vi.fn()
    const mockSetApiKey = vi.fn()

    return {
        default: {
            send: mockSend,
            setApiKey: mockSetApiKey,
        },
    }
})

describe('SendGridEmailService - Integration Tests', () => {
    let emailService: SendGridEmailService
    const originalEnv = process.env

    beforeEach(() => {
        // Resetear mocks
        vi.clearAllMocks()

        // Configurar variables de entorno para tests
        process.env = {
            ...originalEnv,
            SENDGRID_API_KEY: 'SG.test-api-key-for-integration-tests',
            SENDGRID_FROM_EMAIL: 'test@financieramente.com',
            SENDGRID_FROM_NAME: 'Financieramente Test',
        }

        // Crear nueva instancia del servicio
        emailService = new SendGridEmailService()
    })

    afterEach(() => {
        // Restaurar variables de entorno
        process.env = originalEnv
    })

    describe('Inicialización', () => {
        it('debe inicializar correctamente con configuración válida', () => {
            expect(() => new SendGridEmailService()).not.toThrow()
        })

        it('debe lanzar error si falta SENDGRID_API_KEY', async () => {
            delete process.env.SENDGRID_API_KEY

            const service = new SendGridEmailService()

            const toResult = EmailAddress.create('test@example.com')
            const fromResult = EmailAddress.create('from@example.com')
            const subjectResult = EmailSubject.create('Test')

            if (toResult instanceof Error || fromResult instanceof Error || subjectResult instanceof Error) {
                throw new Error('Failed to create value objects')
            }

            const email = new Email(
                randomUUID(),
                toResult,
                fromResult,
                subjectResult,
                undefined,
                'Test'
            )

            await expect(service.send(email)).rejects.toThrow()
        })
    })

    describe('Envío de Email Tradicional', () => {
        it('debe enviar email con texto plano y HTML', async () => {
            const sgMail = await import('@sendgrid/mail')

            // Configurar mock para retornar éxito
            vi.mocked(sgMail.default.send).mockResolvedValue([
                {
                    statusCode: 202,
                    body: {},
                    headers: {
                        'x-message-id': 'test-message-id-123',
                    },
                },
                {},
            ])

            const toResult = EmailAddress.create('recipient@example.com')
            const fromResult = EmailAddress.create('test@financieramente.com')
            const subjectResult = EmailSubject.create('Test Email')

            if (toResult instanceof Error || fromResult instanceof Error || subjectResult instanceof Error) {
                throw new Error('Failed to create value objects')
            }

            const email = new Email(
                randomUUID(),
                toResult,
                fromResult,
                subjectResult,
                undefined,
                'This is a test email',
                '<p>This is a test email</p>'
            )

            const result = await emailService.send(email)

            expect(result.success).toBe(true)
            expect(result.messageId).toBe('test-message-id-123')
            expect(result.statusCode).toBe(202)
            expect(sgMail.default.send).toHaveBeenCalledTimes(1)
        })

        it('debe enviar email solo con texto plano', async () => {
            const sgMail = await import('@sendgrid/mail')

            vi.mocked(sgMail.default.send).mockResolvedValue([
                {
                    statusCode: 202,
                    body: {},
                    headers: {
                        'x-message-id': 'test-message-id-456',
                    },
                },
                {},
            ])

            const toResult = EmailAddress.create('recipient@example.com')
            const fromResult = EmailAddress.create('test@financieramente.com')
            const subjectResult = EmailSubject.create('Test Email')

            if (toResult instanceof Error || fromResult instanceof Error || subjectResult instanceof Error) {
                throw new Error('Failed to create value objects')
            }

            const email = new Email(
                randomUUID(),
                toResult,
                fromResult,
                subjectResult,
                undefined,
                'This is a test email'
            )

            const result = await emailService.send(email)

            expect(result.success).toBe(true)
            expect(sgMail.default.send).toHaveBeenCalledTimes(1)
        })

        it('debe retornar error si no hay contenido', async () => {
            const toResult = EmailAddress.create('recipient@example.com')
            const fromResult = EmailAddress.create('test@financieramente.com')
            const subjectResult = EmailSubject.create('Test Email')

            if (toResult instanceof Error || fromResult instanceof Error || subjectResult instanceof Error) {
                throw new Error('Failed to create value objects')
            }

            const email = new Email(
                randomUUID(),
                toResult,
                fromResult,
                subjectResult
            )

            const result = await emailService.send(email)

            expect(result.success).toBe(false)
            expect(result.error).toContain('contenido')
        })
    })

    describe('Envío de Email con Template', () => {
        it('debe enviar email con template dinámico', async () => {
            const sgMail = await import('@sendgrid/mail')

            vi.mocked(sgMail.default.send).mockResolvedValue([
                {
                    statusCode: 202,
                    body: {},
                    headers: {
                        'x-message-id': 'test-template-message-id',
                    },
                },
                {},
            ])

            const toResult = EmailAddress.create('recipient@example.com')
            if (toResult instanceof Error) {
                throw new Error('Failed to create email address')
            }

            const templateId = 'd-7bddba2ac2ba49ff952c4c2c689d55b7'
            const dynamicData = {
                nombre: 'Test User',
                mensaje: 'Test message',
            }

            const result = await emailService.sendTemplated(
                templateId,
                toResult,
                dynamicData
            )

            expect(result.success).toBe(true)
            expect(result.messageId).toBe('test-template-message-id')
            expect(result.statusCode).toBe(202)
            expect(sgMail.default.send).toHaveBeenCalledTimes(1)

            // Verificar que se llamó con los parámetros correctos
            const callArgs = vi.mocked(sgMail.default.send).mock.calls[0][0]
            expect(callArgs).toMatchObject({
                to: 'recipient@example.com',
                from: {
                    email: 'test@financieramente.com',
                    name: 'Financieramente Test',
                },
                templateId,
                dynamicTemplateData: dynamicData,
            })
        })
    })

    describe('Manejo de Errores', () => {
        it('debe manejar errores de SendGrid correctamente', async () => {
            const sgMail = await import('@sendgrid/mail')

            const sendGridError = {
                response: {
                    statusCode: 400,
                    body: {
                        errors: [
                            {
                                message: 'Invalid email address',
                                field: 'to',
                            },
                        ],
                    },
                },
            }

            vi.mocked(sgMail.default.send).mockRejectedValue(sendGridError)

            const toResult = EmailAddress.create('recipient@example.com')
            const fromResult = EmailAddress.create('test@financieramente.com')
            const subjectResult = EmailSubject.create('Test Email')

            if (toResult instanceof Error || fromResult instanceof Error || subjectResult instanceof Error) {
                throw new Error('Failed to create value objects')
            }

            const email = new Email(
                randomUUID(),
                toResult,
                fromResult,
                subjectResult,
                undefined,
                'Test'
            )

            const result = await emailService.send(email)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Invalid email address')
            expect(result.statusCode).toBe(400)
        })

        it('debe manejar errores genéricos', async () => {
            const sgMail = await import('@sendgrid/mail')

            vi.mocked(sgMail.default.send).mockRejectedValue(
                new Error('Network error')
            )

            const toResult = EmailAddress.create('recipient@example.com')
            const fromResult = EmailAddress.create('test@financieramente.com')
            const subjectResult = EmailSubject.create('Test Email')

            if (toResult instanceof Error || fromResult instanceof Error || subjectResult instanceof Error) {
                throw new Error('Failed to create value objects')
            }

            const email = new Email(
                randomUUID(),
                toResult,
                fromResult,
                subjectResult,
                undefined,
                'Test'
            )

            const result = await emailService.send(email)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Network error')
        })
    })

    describe('Validación de Respuestas', () => {
        it('debe retornar messageId cuando está disponible', async () => {
            const sgMail = await import('@sendgrid/mail')

            vi.mocked(sgMail.default.send).mockResolvedValue([
                {
                    statusCode: 202,
                    body: {},
                    headers: {
                        'x-message-id': 'unique-message-id-789',
                    },
                },
                {},
            ])

            const toResult = EmailAddress.create('recipient@example.com')
            if (toResult instanceof Error) {
                throw new Error('Failed to create email address')
            }

            const templateId = 'd-7bddba2ac2ba49ff952c4c2c689d55b7'

            const result = await emailService.sendTemplated(templateId, toResult, {})

            expect(result.messageId).toBe('unique-message-id-789')
        })

        it('debe retornar statusCode correcto', async () => {
            const sgMail = await import('@sendgrid/mail')

            vi.mocked(sgMail.default.send).mockResolvedValue([
                {
                    statusCode: 202,
                    body: {},
                    headers: {},
                },
                {},
            ])

            const toResult = EmailAddress.create('recipient@example.com')
            const fromResult = EmailAddress.create('test@financieramente.com')
            const subjectResult = EmailSubject.create('Test')

            if (toResult instanceof Error || fromResult instanceof Error || subjectResult instanceof Error) {
                throw new Error('Failed to create value objects')
            }

            const email = new Email(
                randomUUID(),
                toResult,
                fromResult,
                subjectResult,
                undefined,
                'Test'
            )

            const result = await emailService.send(email)

            expect(result.statusCode).toBe(202)
        })
    })
})
