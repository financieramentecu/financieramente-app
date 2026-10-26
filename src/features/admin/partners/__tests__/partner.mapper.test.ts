import { describe, it, expect } from 'vitest'
import { toPartnerDto, type PartnerRow } from '../mappers/partner.mapper'

const CREATED = new Date('2026-10-10T15:30:00.000Z')

function row(overrides: Partial<PartnerRow> = {}): PartnerRow {
	return {
		idUser: 12,
		name: 'Ana',
		lastName: 'Gómez',
		typeIdentity: 'CC',
		identityNumber: '1020304050',
		email: 'ana@partner.com',
		phone: '3001234567',
		active: true,
		activatedAt: null,
		createdAt: CREATED,
		leader: { idUser: 7, name: 'Luis', lastName: 'Pérez', email: 'l@x.com' },
		...overrides,
	}
}

describe('toPartnerDto', () => {
	it('maps identifiers, ISO dates and the leader summary', () => {
		const dto = toPartnerDto(row())
		expect(dto).toMatchObject({
			id: 12,
			name: 'Ana',
			lastName: 'Gómez',
			typeIdentity: 'CC',
			identityNumber: '1020304050',
			email: 'ana@partner.com',
			phone: '3001234567',
			active: true,
			activatedAt: null,
			createdAt: '2026-10-10T15:30:00.000Z',
			leader: { id: 7, name: 'Luis', lastName: 'Pérez', email: 'l@x.com' },
		})
	})

	it('derives PENDING / ACTIVE / DEACTIVATED', () => {
		expect(toPartnerDto(row()).status).toBe('PENDING')
		expect(
			toPartnerDto(row({ activatedAt: new Date('2026-10-11T00:00:00Z') }))
				.status
		).toBe('ACTIVE')
		expect(toPartnerDto(row({ active: false })).status).toBe('DEACTIVATED')
	})

	it('serializes activatedAt as ISO when present', () => {
		const dto = toPartnerDto(
			row({ activatedAt: new Date('2026-10-11T08:00:00Z') })
		)
		expect(dto.activatedAt).toBe('2026-10-11T08:00:00.000Z')
	})

	it('allows a missing leader and never exposes password or token fields', () => {
		const dto = toPartnerDto(row({ leader: null }))
		expect(dto.leader).toBeNull()
		expect(Object.keys(dto)).not.toContain('password')
		expect(Object.keys(dto)).not.toContain('tokenHash')
	})

	it('exposes the leader level code so the edit form can preselect it', () => {
		const dto = toPartnerDto(
			row({
				leader: {
					idUser: 7,
					name: 'Luis',
					lastName: null,
					email: 'l@x.com',
					level: { code: 'LEVEL_2' },
				},
			})
		)
		expect(dto.leader?.levelCode).toBe('LEVEL_2')
	})

	it('falls back to a null leader level code when the leader has no level', () => {
		expect(toPartnerDto(row()).leader?.levelCode).toBeNull()
	})
})
