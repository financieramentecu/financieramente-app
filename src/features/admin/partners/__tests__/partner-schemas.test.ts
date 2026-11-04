import { describe, it, expect } from 'vitest'
import {
	createPartnerSchema,
	updatePartnerSchema,
	leaderLevelQuerySchema,
} from '../lib/partner-schemas'

const VALID = {
	name: 'Ana',
	lastName: 'Gómez',
	typeIdentity: 'CC',
	identityNumber: '1020304050',
	email: 'ana@partner.com',
	phone: '3001234567',
	leaderId: 7,
}

function firstMessage(input: unknown): string | undefined {
	const result = createPartnerSchema.safeParse(input)
	return result.success ? undefined : result.error.issues[0]?.message
}

describe('createPartnerSchema', () => {
	it('accepts a complete payload', () => {
		const result = createPartnerSchema.safeParse(VALID)
		expect(result.success).toBe(true)
	})

	it('normalizes the email to trimmed lowercase', () => {
		const result = createPartnerSchema.parse({
			...VALID,
			email: '  Ana@Partner.COM ',
		})
		expect(result.email).toBe('ana@partner.com')
	})

	it('accepts any email domain', () => {
		expect(
			createPartnerSchema.safeParse({ ...VALID, email: 'a@gmail.com' }).success
		).toBe(true)
	})

	it('makes lastName and phone optional and drops empty strings', () => {
		const result = createPartnerSchema.parse({
			...VALID,
			lastName: '',
			phone: '   ',
		})
		expect(result.lastName).toBeUndefined()
		expect(result.phone).toBeUndefined()
	})

	it.each([
		['name', { name: '' }, 'El nombre es obligatorio'],
		['email', { email: 'not-an-email' }, 'Correo electrónico inválido'],
		['typeIdentity', { typeIdentity: 'XX' }, 'Tipo de documento inválido'],
		[
			'identityNumber',
			{ identityNumber: '' },
			'El número de documento es obligatorio',
		],
		[
			'identityNumber chars',
			{ identityNumber: '12 34;DROP' },
			'El número de documento solo admite letras, números y guiones',
		],
		['leaderId zero', { leaderId: 0 }, 'Selecciona un líder'],
		['leaderId float', { leaderId: 1.5 }, 'Selecciona un líder'],
	])('rejects invalid %s with a Spanish message', (_label, patch, message) => {
		expect(firstMessage({ ...VALID, ...patch })).toBe(message)
	})

	it('requires the leader (PM-02)', () => {
		const { leaderId: _omit, ...withoutLeader } = VALID
		void _omit
		expect(firstMessage(withoutLeader)).toBe('Selecciona un líder')
	})

	it('rejects a null leader', () => {
		expect(firstMessage({ ...VALID, leaderId: null })).toBe(
			'Selecciona un líder'
		)
	})

	it('does not let the client choose role, level, category or status', () => {
		const result = createPartnerSchema.parse({
			...VALID,
			roleId: 1,
			levelId: 2,
			categoryId: 3,
			active: false,
			activatedAt: '2026-01-01',
			password: 'x',
		})
		expect(result).not.toHaveProperty('roleId')
		expect(result).not.toHaveProperty('levelId')
		expect(result).not.toHaveProperty('categoryId')
		expect(result).not.toHaveProperty('active')
		expect(result).not.toHaveProperty('activatedAt')
		expect(result).not.toHaveProperty('password')
	})
})

describe('leaderLevelQuerySchema', () => {
	it.each(['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5'])(
		'accepts %s',
		(code) => {
			expect(leaderLevelQuerySchema.safeParse(code).success).toBe(true)
		}
	)

	it.each([
		'LEVEL_0',
		'GENERAL_LEVEL',
		'PARTNER_EXTERNAL',
		'level_1',
		'LEVEL_6',
		'',
		null,
	])('rejects %s', (code) => {
		expect(leaderLevelQuerySchema.safeParse(code).success).toBe(false)
	})
})

describe('updatePartnerSchema', () => {
	const EDIT = {
		name: 'Ana',
		lastName: 'Gómez',
		typeIdentity: 'CC',
		identityNumber: '1020304050',
		phone: '3001234567',
		leaderId: 7,
	}

	it('accepts the editable fields without an email', () => {
		expect(updatePartnerSchema.safeParse(EDIT).success).toBe(true)
	})

	it('strips email and every server-owned field (never applied)', () => {
		const result = updatePartnerSchema.parse({
			...EDIT,
			email: 'other@partner.com',
			role: 'ADMIN',
			roleId: 1,
			levelId: 2,
			categoryId: 3,
			active: false,
			activatedAt: '2026-01-01',
			password: 'x',
		})
		expect(Object.keys(result).sort()).toEqual([
			'identityNumber',
			'lastName',
			'leaderId',
			'name',
			'phone',
			'typeIdentity',
		])
	})

	it.each([
		[{ name: '  ' }, 'El nombre es obligatorio'],
		[{ typeIdentity: 'XX' }, 'Tipo de documento inválido'],
		[{ identityNumber: '' }, 'El número de documento es obligatorio'],
		[
			{ identityNumber: 'a b' },
			'El número de documento solo admite letras, números y guiones',
		],
		[{ leaderId: undefined }, 'Selecciona un líder'],
		[{ leaderId: 0 }, 'Selecciona un líder'],
	])('rejects %j with its Spanish message', (override, message) => {
		const result = updatePartnerSchema.safeParse({ ...EDIT, ...override })
		expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
			message
		)
	})

	it('treats empty optional fields as absent', () => {
		const result = updatePartnerSchema.parse({
			...EDIT,
			lastName: '',
			phone: '',
		})
		expect(result.lastName).toBeUndefined()
		expect(result.phone).toBeUndefined()
	})
})
