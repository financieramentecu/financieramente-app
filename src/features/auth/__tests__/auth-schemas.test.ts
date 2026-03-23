import { describe, it, expect } from 'vitest'
import { loginSchema, emailSchema } from '../lib/auth-schemas'

describe('auth-schemas', () => {
	describe('loginSchema', () => {
		it('should validate valid login data (happy path)', () => {
			const validData = {
				email: 'usuario@financieramentecu.com',
				password: 'password123',
			}

			const result = loginSchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.email).toBe('usuario@financieramentecu.com')
				expect(result.data.password).toBe('password123')
			}
		})

		it('should reject empty email', () => {
			const data = {
				email: '',
				password: 'password123',
			}

			const result = loginSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('obligatorio')
			}
		})

		it('should reject invalid email format', () => {
			const data = {
				email: 'invalid-email',
				password: 'password123',
			}

			const result = loginSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('válido')
			}
		})

		it('should reject email without corporate domain', () => {
			const data = {
				email: 'usuario@gmail.com',
				password: 'password123',
			}

			const result = loginSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('corporativos')
			}
		})

		it('should accept email with corporate domain', () => {
			const data = {
				email: 'admin@financieramentecu.com',
				password: 'password123',
			}

			const result = loginSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should reject empty password', () => {
			const data = {
				email: 'usuario@financieramentecu.com',
				password: '',
			}

			const result = loginSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('obligatoria')
			}
		})

		it('should reject password shorter than 8 characters', () => {
			const data = {
				email: 'usuario@financieramentecu.com',
				password: '1234567',
			}

			const result = loginSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('8 caracteres')
			}
		})

		it('should accept password with exactly 8 characters', () => {
			const data = {
				email: 'usuario@financieramentecu.com',
				password: '12345678',
			}

			const result = loginSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should accept password longer than 8 characters', () => {
			const data = {
				email: 'usuario@financieramentecu.com',
				password: 'verylongpassword123',
			}

			const result = loginSchema.safeParse(data)
			expect(result.success).toBe(true)
		})
	})

	describe('emailSchema', () => {
		it('should validate valid email (happy path)', () => {
			const validData = {
				email: 'usuario@example.com',
			}

			const result = emailSchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.email).toBe('usuario@example.com')
			}
		})

		it('should reject empty email', () => {
			const data = {
				email: '',
			}

			const result = emailSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('obligatorio')
			}
		})

		it('should reject invalid email format', () => {
			const data = {
				email: 'invalid-email',
			}

			const result = emailSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('válido')
			}
		})

		it('should accept valid email with any domain', () => {
			const data = {
				email: 'usuario@gmail.com',
			}

			const result = emailSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should accept email with subdomain', () => {
			const data = {
				email: 'usuario@subdomain.example.com',
			}

			const result = emailSchema.safeParse(data)
			expect(result.success).toBe(true)
		})
	})
})
