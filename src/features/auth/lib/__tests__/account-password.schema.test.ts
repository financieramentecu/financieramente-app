import { describe, it, expect } from 'vitest'
import {
	accountPasswordSchema,
	PASSWORD_REQUIREMENTS,
} from '../account-password.schema'

describe('accountPasswordSchema', () => {
	it.each([
		'abcdefgh', // no uppercase, no digit, no special
		'12345678', // only digits
		'abc123', // too short
		'',
		'Ab1', // too short
		'abcd1234', // no uppercase, no special
		'ABCD1234', // no lowercase, no special
		'Contrasena9', // no special character
		'contraseña!', // no uppercase, no digit
	])('rejects non-compliant password %j', (password) => {
		expect(accountPasswordSchema.safeParse(password).success).toBe(false)
	})

	it.each(['Abcdef1!', 'Contrasena9!', 'MiClave#2026', 'Aa1' + '!'.repeat(5)])(
		'accepts a password with lowercase, uppercase, number and special char',
		(password) => {
			expect(accountPasswordSchema.safeParse(password).success).toBe(true)
		}
	)

	it('enforces the 8 and 72 character boundaries', () => {
		expect(accountPasswordSchema.safeParse('Abcdef1!'.slice(0, 7)).success).toBe(
			false
		)
		expect(accountPasswordSchema.safeParse('Abcdefg1!').success).toBe(true)
		expect(
			accountPasswordSchema.safeParse('Aa1!' + 'a'.repeat(68)).success
		).toBe(true)
		expect(
			accountPasswordSchema.safeParse('Aa1!' + 'a'.repeat(69)).success
		).toBe(false)
	})

	it('rejects non-string input', () => {
		expect(accountPasswordSchema.safeParse(12345678).success).toBe(false)
		expect(accountPasswordSchema.safeParse(undefined).success).toBe(false)
	})

	it('uses Spanish error messages, one per missing rule', () => {
		const noUpper = accountPasswordSchema.safeParse('abcdef1!')
		const noLower = accountPasswordSchema.safeParse('ABCDEF1!')
		const noDigit = accountPasswordSchema.safeParse('Abcdefg!')
		const noSpecial = accountPasswordSchema.safeParse('Abcdefg1')
		const short = accountPasswordSchema.safeParse('Ab1!')
		const long = accountPasswordSchema.safeParse('Aa1!' + 'a'.repeat(69))
		const msgs = (r: typeof noUpper) =>
			r.success ? [] : r.error.issues.map((i) => i.message)

		expect(msgs(noUpper)).toContain(
			'La contraseña debe contener al menos una letra mayúscula'
		)
		expect(msgs(noLower)).toContain(
			'La contraseña debe contener al menos una letra minúscula'
		)
		expect(msgs(noDigit)).toContain(
			'La contraseña debe contener al menos un número'
		)
		expect(msgs(noSpecial)).toContain(
			'La contraseña debe contener al menos un carácter especial'
		)
		expect(msgs(short)).toContain(
			'La contraseña debe tener al menos 8 caracteres'
		)
		expect(msgs(long)).toContain(
			'La contraseña no puede superar 72 caracteres'
		)
	})
})

describe('PASSWORD_REQUIREMENTS', () => {
	it('drives the exact same rules as the schema (single source of truth)', () => {
		const ids = PASSWORD_REQUIREMENTS.map((r) => r.id)
		expect(ids).toEqual(['length', 'lowercase', 'uppercase', 'number', 'special'])
	})

	it.each([
		['length', 'Abcdef1!', true],
		['length', 'Ab1!', false],
		['lowercase', 'ABCDEF1!', false],
		['lowercase', 'aBCDEF1!', true],
		['uppercase', 'abcdefg1!', false],
		['uppercase', 'Abcdefg1!', true],
		['number', 'Abcdefgh!', false],
		['number', 'Abcdefg1!', true],
		['special', 'Abcdefg1', false],
		['special', 'Abcdefg1!', true],
	] as const)('requirement %s evaluates %j as %s', (id, password, expected) => {
		const requirement = PASSWORD_REQUIREMENTS.find((r) => r.id === id)!
		expect(requirement.test(password)).toBe(expected)
	})
})
