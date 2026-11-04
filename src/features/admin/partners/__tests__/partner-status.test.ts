import { describe, it, expect } from 'vitest'
import {
	PARTNER_STATUS,
	PARTNER_STATUS_LABELS,
	derivePartnerStatus,
} from '../lib/partner-status'

describe('derivePartnerStatus', () => {
	it('is PENDING when active and never activated', () => {
		expect(derivePartnerStatus({ active: true, activatedAt: null })).toBe(
			PARTNER_STATUS.PENDING
		)
	})

	it('is ACTIVE when active and activated', () => {
		expect(derivePartnerStatus({ active: true, activatedAt: new Date() })).toBe(
			PARTNER_STATUS.ACTIVE
		)
	})

	it.each([null, new Date('2026-01-01T00:00:00Z')])(
		'is DEACTIVATED whenever active is false (activatedAt=%s)',
		(activatedAt) => {
			expect(derivePartnerStatus({ active: false, activatedAt })).toBe(
				PARTNER_STATUS.DEACTIVATED
			)
		}
	)

	it('exposes the Spanish labels', () => {
		expect(PARTNER_STATUS_LABELS).toEqual({
			PENDING: 'Pendiente',
			ACTIVE: 'Activo',
			DEACTIVATED: 'Desactivado',
		})
	})
})
