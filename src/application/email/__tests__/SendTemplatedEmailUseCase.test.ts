import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SendTemplatedEmailUseCase } from '../use-cases/SendTemplatedEmailUseCase'
import {
	IEmailRepository,
	EmailResult,
} from '@/domain/email/repositories/IEmailRepository'
import { EmailAddress } from '@/domain/email/value-objects/EmailAddress'

describe('SendTemplatedEmailUseCase', () => {
	let mockRepository: IEmailRepository
	let useCase: SendTemplatedEmailUseCase

	beforeEach(() => {
		mockRepository = {
			send: vi.fn(),
			sendTemplated: vi.fn(),
		}
		useCase = new SendTemplatedEmailUseCase(mockRepository)
	})

	it('debe enviar email exitosamente', async () => {
		const mockResult: EmailResult = {
			success: true,
			messageId: 'test-message-id',
		}

		vi.mocked(mockRepository.sendTemplated).mockResolvedValue(mockResult)

		const result = await useCase.execute({
			to: 'test@example.com',
			templateId: 'd-7bddba2ac2ba49ff952c4c2c689d55b7',
			dynamicTemplateData: { nombre: 'Test' },
		})

		expect(result.success).toBe(true)
		expect(result.messageId).toBe('test-message-id')
		expect(mockRepository.sendTemplated).toHaveBeenCalledWith(
			'd-7bddba2ac2ba49ff952c4c2c689d55b7',
			expect.any(EmailAddress),
			{ nombre: 'Test' }
		)
	})

	it('debe retornar error si el email es inválido', async () => {
		const result = await useCase.execute({
			to: 'invalid-email',
			templateId: 'd-7bddba2ac2ba49ff952c4c2c689d55b7',
			dynamicTemplateData: {},
		})

		expect(result.success).toBe(false)
		expect(result.error).toContain('inválido')
	})

	it('debe retornar error si el template ID es inválido', async () => {
		const result = await useCase.execute({
			to: 'test@example.com',
			templateId: 'invalid-template-id',
			dynamicTemplateData: {},
		})

		expect(result.success).toBe(false)
		expect(result.error).toContain('template ID')
	})

	it('debe manejar errores del repositorio', async () => {
		const mockResult: EmailResult = {
			success: false,
			error: 'Error de SendGrid',
		}

		vi.mocked(mockRepository.sendTemplated).mockResolvedValue(mockResult)

		const result = await useCase.execute({
			to: 'test@example.com',
			templateId: 'd-7bddba2ac2ba49ff952c4c2c689d55b7',
			dynamicTemplateData: {},
		})

		expect(result.success).toBe(false)
		expect(result.error).toBe('Error de SendGrid')
	})
})
