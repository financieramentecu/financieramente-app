import { describe, it, expect } from 'vitest'
import { validateLeaderCandidate } from '../lib/partner-leader-rules'

const OK = { active: true, levelCode: 'LEVEL_3', roleCode: 'AGENTE' }

describe('validateLeaderCandidate (PM-02, PM-03)', () => {
	it.each(['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5'])(
		'accepts an active %s user that is not a partner',
		(levelCode) => {
			expect(validateLeaderCandidate({ ...OK, levelCode })).toEqual({
				ok: true,
			})
		}
	)

	it('rejects a missing leader', () => {
		const result = validateLeaderCandidate(null)
		expect(result).toEqual({ ok: false, error: 'El líder no existe' })
	})

	it('rejects an inactive leader', () => {
		const result = validateLeaderCandidate({ ...OK, active: false })
		expect(result).toEqual({ ok: false, error: 'El líder debe estar activo' })
	})

	it.each(['LEVEL_0', 'GENERAL_LEVEL', 'PARTNER_EXTERNAL', null])(
		'rejects level %s',
		(levelCode) => {
			const result = validateLeaderCandidate({ ...OK, levelCode })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toBe(
					'El líder debe tener un nivel entre Nivel 1 y Nivel 5'
				)
			}
		}
	)

	it('rejects a PARTNER role even with a valid level', () => {
		const result = validateLeaderCandidate({ ...OK, roleCode: 'PARTNER' })
		expect(result).toEqual({
			ok: false,
			error: 'Un partner no puede ser líder',
		})
	})
})
