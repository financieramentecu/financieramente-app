import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendEmail, sendTemplatedEmail } from '../../lib/email-service'
import sgMail from '@sendgrid/mail'

// Mock SendGrid
vi.mock('@sendgrid/mail', () => ({
	default: {
		setApiKey: vi.fn(),
		send: vi.fn(),
	},
}))

// Mock environment variables
const originalEnv = process.env

describe('Email Service', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		process.env = {
			...originalEnv,
			SENDGRID_API_KEY: 'test-api-key',
			SENDGRID_FROM_EMAIL: 'test@example.com',
			SENDGRID_FROM_NAME: 'Test Sender',
		}
	})

	afterEach(() => {
		process.env = originalEnv
	})

	describe('sendEmail', () => {
		it('should send a traditional email successfully', async () => {
			const mockResponse = {
				headers: { 'x-message-id': 'test-message-id' },
				statusCode: 202,
			}
			;(
				sgMail.send as unknown as ReturnType<typeof vi.fn>
			).mockResolvedValueOnce([mockResponse])

			const result = await sendEmail({
				to: 'recipient@example.com',
				subject: 'Test Subject',
				text: 'Test body',
			})

			expect(result.success).toBe(true)
			expect(result.messageId).toBe('test-message-id')
			expect(sgMail.send).toHaveBeenCalled()
		})

		it('should return error for invalid email', async () => {
			const result = await sendEmail({
				to: 'invalid-email',
				subject: 'Test',
				text: 'Test',
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain('Email de destino inválido')
		})

		it('should return error when no content provided', async () => {
			const result = await sendEmail({
				to: 'recipient@example.com',
				subject: 'Test',
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain('texto plano o HTML')
		})
	})

	describe('sendTemplatedEmail', () => {
		it('should send a templated email successfully', async () => {
			const mockResponse = {
				headers: { 'x-message-id': 'test-message-id' },
				statusCode: 202,
			}
			;(
				sgMail.send as unknown as ReturnType<typeof vi.fn>
			).mockResolvedValueOnce([mockResponse])

			const result = await sendTemplatedEmail({
				to: 'recipient@example.com',
				templateId: 'd-12345678901234567890123456789012',
				dynamicTemplateData: { name: 'Test' },
			})

			expect(result.success).toBe(true)
			expect(result.messageId).toBe('test-message-id')
			expect(sgMail.send).toHaveBeenCalled()
		})

		it('should return error for invalid template ID', async () => {
			const result = await sendTemplatedEmail({
				to: 'recipient@example.com',
				templateId: 'invalid-template-id',
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain('template ID')
		})
	})
})
