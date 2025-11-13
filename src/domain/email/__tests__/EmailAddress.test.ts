import { describe, it, expect } from 'vitest'
import { EmailAddress } from '../value-objects/EmailAddress'

describe('EmailAddress', () => {
  describe('create', () => {
    it('debe crear un EmailAddress válido', () => {
      const result = EmailAddress.create('test@example.com')
      expect(result).toBeInstanceOf(EmailAddress)
      expect((result as EmailAddress).getValue()).toBe('test@example.com')
    })

    it('debe normalizar el email a minúsculas', () => {
      const result = EmailAddress.create('TEST@EXAMPLE.COM')
      expect((result as EmailAddress).getValue()).toBe('test@example.com')
    })

    it('debe eliminar espacios en blanco', () => {
      const result = EmailAddress.create('  test@example.com  ')
      expect((result as EmailAddress).getValue()).toBe('test@example.com')
    })

    it('debe retornar error si el email está vacío', () => {
      const result = EmailAddress.create('')
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toContain('requerido')
    })

    it('debe retornar error si el email es inválido', () => {
      const result = EmailAddress.create('invalid-email')
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toContain('formato')
    })

    it('debe retornar error si el email excede 254 caracteres', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      const result = EmailAddress.create(longEmail)
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toContain('254')
    })
  })

  describe('equals', () => {
    it('debe retornar true para emails iguales', () => {
      const email1 = EmailAddress.create('test@example.com') as EmailAddress
      const email2 = EmailAddress.create('TEST@EXAMPLE.COM') as EmailAddress
      expect(email1.equals(email2)).toBe(true)
    })

    it('debe retornar false para emails diferentes', () => {
      const email1 = EmailAddress.create('test1@example.com') as EmailAddress
      const email2 = EmailAddress.create('test2@example.com') as EmailAddress
      expect(email1.equals(email2)).toBe(false)
    })
  })
})

