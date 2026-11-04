import { describe, it, expect } from 'vitest'
import {
	PARTNER_LEADER_ERROR,
	PARTNER_MANAGED_ERROR,
	isPartnerAccount,
} from '../partner-guard'

describe('isPartnerAccount', () => {
	it('is true for the PARTNER role', () => {
		expect(isPartnerAccount({ role: { code: 'PARTNER' }, level: null })).toBe(
			true
		)
	})

	it('is true for the PARTNER_EXTERNAL level even without the role', () => {
		expect(
			isPartnerAccount({
				role: { code: 'AGENTE' },
				level: { code: 'PARTNER_EXTERNAL' },
			})
		).toBe(true)
	})

	it.each([
		[{ role: { code: 'AGENTE' }, level: { code: 'LEVEL_3' } }],
		[{ role: null, level: null }],
		[{}],
	])('is false for ordinary accounts %j', (account) => {
		expect(isPartnerAccount(account)).toBe(false)
	})

	it('exposes Spanish messages pointing to the Partners module', () => {
		expect(PARTNER_MANAGED_ERROR).toContain('módulo Partners')
		expect(PARTNER_LEADER_ERROR).toBe('Un partner no puede ser líder')
	})
})
