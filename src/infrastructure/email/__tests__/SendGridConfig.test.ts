import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SendGridConfig } from '../sendgrid/SendGridConfig'

describe('SendGridConfig', () => {
	const originalEnv = process.env

	beforeEach(() => {
		vi.resetModules()
		process.env = { ...originalEnv }
	})

	afterEach(() => {
		process.env = originalEnv
	})

	describe('validate', () => {
		it('debe lanzar error si faltan variables requeridas', () => {
			delete process.env.SENDGRID_API_KEY
			delete process.env.SENDGRID_FROM_EMAIL

			expect(() => SendGridConfig.validate()).toThrow()
		})

		it('debe pasar si todas las variables están configuradas', () => {
			process.env.SENDGRID_API_KEY = 'SG.test'
			process.env.SENDGRID_FROM_EMAIL = 'test@example.com'

			expect(() => SendGridConfig.validate()).not.toThrow()
		})
	})

	describe('getApiKey', () => {
		it('debe retornar la API Key', () => {
			process.env.SENDGRID_API_KEY = 'SG.test123'
			expect(SendGridConfig.getApiKey()).toBe('SG.test123')
		})

		it('debe lanzar error si no está configurada', () => {
			delete process.env.SENDGRID_API_KEY
			expect(() => SendGridConfig.getApiKey()).toThrow()
		})
	})

	describe('getFromEmail', () => {
		it('debe retornar el email de origen', () => {
			process.env.SENDGRID_FROM_EMAIL = 'test@example.com'
			expect(SendGridConfig.getFromEmail()).toBe('test@example.com')
		})
	})

	describe('getFromName', () => {
		it('debe retornar el nombre por defecto si no está configurado', () => {
			delete process.env.SENDGRID_FROM_NAME
			expect(SendGridConfig.getFromName()).toBe('Financieramente')
		})

		it('debe retornar el nombre configurado', () => {
			process.env.SENDGRID_FROM_NAME = 'Test Name'
			expect(SendGridConfig.getFromName()).toBe('Test Name')
		})
	})
})
