import { describe, it, expect } from 'vitest'
import { EmailSubject } from '../value-objects/EmailSubject'

describe('EmailSubject', () => {
  describe('create', () => {
    it('debe crear un EmailSubject válido', () => {
      const result = EmailSubject.create('Test Subject')
      expect(result).toBeInstanceOf(EmailSubject)
      expect((result as EmailSubject).getValue()).toBe('Test Subject')
    })

    it('debe retornar error si el asunto está vacío', () => {
      const result = EmailSubject.create('')
      expect(result).toBeInstanceOf(Error)
    })

    it('debe retornar error si el asunto excede 200 caracteres', () => {
      const longSubject = 'a'.repeat(201)
      const result = EmailSubject.create(longSubject)
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toContain('200')
    })

    it('debe eliminar espacios en blanco', () => {
      const result = EmailSubject.create('  Test Subject  ')
      expect((result as EmailSubject).getValue()).toBe('Test Subject')
    })
  })
})

