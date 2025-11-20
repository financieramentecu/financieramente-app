import { describe, it, expect, vi, beforeEach } from 'vitest'
import { notifyUserAccountCreated, notifyAdminNewUser } from '../notifications'

// Mock de SendEmailUseCase
vi.mock('@/application/email/use-cases/SendEmailUseCase', () => ({
  SendEmailUseCase: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
  })),
}))

// Mock de SendGridEmailService
vi.mock('@/infrastructure/email/sendgrid/SendGridEmailService', () => ({
  SendGridEmailService: vi.fn(),
}))

import { SendEmailUseCase } from '@/application/email/use-cases/SendEmailUseCase'
import { SendGridEmailService } from '@/infrastructure/email/sendgrid/SendGridEmailService'

describe('notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('notifyUserAccountCreated', () => {
    it('debe enviar email de notificación al usuario', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      })

      vi.mocked(SendEmailUseCase).mockImplementation(() => ({
        execute: mockExecute,
      }) as unknown as SendEmailUseCase)

      await notifyUserAccountCreated({
        email: 'test@financieramentecu.com',
        name: 'Test User',
      })

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@financieramentecu.com',
          subject: expect.stringContaining('Cuenta creada'),
        })
      )
    })

    it('debe manejar errores sin lanzar excepción', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('Email error'))

      vi.mocked(SendEmailUseCase).mockImplementation(() => ({
        execute: mockExecute,
      }) as unknown as SendEmailUseCase)

      // No debe lanzar error
      await expect(
        notifyUserAccountCreated({
          email: 'test@financieramentecu.com',
          name: 'Test User',
        })
      ).resolves.not.toThrow()
    })
  })

  describe('notifyAdminNewUser', () => {
    it('debe enviar email de notificación al administrador', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      })

      vi.mocked(SendEmailUseCase).mockImplementation(() => ({
        execute: mockExecute,
      }) as unknown as SendEmailUseCase)

      await notifyAdminNewUser({
        userEmail: 'newuser@financieramentecu.com',
        userName: 'New User',
        userId: 1,
      })

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Nuevo usuario registrado'),
        })
      )
    })

    it('debe usar email de administrador desde variables de entorno', async () => {
      const originalEnv = process.env.ADMIN_EMAIL
      process.env.ADMIN_EMAIL = 'admin@test.com'

      const mockExecute = vi.fn().mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      })

      vi.mocked(SendEmailUseCase).mockImplementation(() => ({
        execute: mockExecute,
      }) as unknown as SendEmailUseCase)

      await notifyAdminNewUser({
        userEmail: 'newuser@financieramentecu.com',
        userName: 'New User',
        userId: 1,
      })

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@test.com',
        })
      )

      process.env.ADMIN_EMAIL = originalEnv
    })

    it('debe manejar errores sin lanzar excepción', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('Email error'))

      vi.mocked(SendEmailUseCase).mockImplementation(() => ({
        execute: mockExecute,
      }) as unknown as SendEmailUseCase)

      // No debe lanzar error
      await expect(
        notifyAdminNewUser({
          userEmail: 'newuser@financieramentecu.com',
          userName: 'New User',
          userId: 1,
        })
      ).resolves.not.toThrow()
    })
  })
})

