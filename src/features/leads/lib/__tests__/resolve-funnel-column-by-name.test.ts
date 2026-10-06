import { describe, it, expect } from 'vitest'
import * as resolveFunnelColumnByNameModule from '@/features/leads/lib/resolve-funnel-column-by-name'
import { resolveFunnelColumnByName } from '@/features/leads/lib/resolve-funnel-column-by-name'
import type { LeadFunnelColumn } from '@prisma/client'

function makeColumn(overrides: Partial<LeadFunnelColumn> = {}): LeadFunnelColumn {
	return {
		idLeadFunnelColumn: 1,
		name: 'Contactado',
		externalStatusKey: 'CONTACTADO',
		position: 0,
		isFallback: false,
		active: true,
		...overrides,
	} as LeadFunnelColumn
}

describe('resolveFunnelColumnByName', () => {
	it('resolves an exact case-sensitive match', () => {
		const contactado = makeColumn({ name: 'Contactado' })
		const columns = [contactado]

		const result = resolveFunnelColumnByName('Contactado', columns)

		expect(result.rejected).toBe(false)
		if (!result.rejected) {
			expect(result.value.idLeadFunnelColumn).toBe(contactado.idLeadFunnelColumn)
		}
	})

	it('rejects a case mismatch, never fuzzy-matching', () => {
		const columns = [makeColumn({ name: 'Contactado' })]

		const result = resolveFunnelColumnByName('contactado', columns)

		expect(result.rejected).toBe(true)
		if (result.rejected) {
			expect(result.reason).toContain('Contactado')
		}
	})

	it('rejects a whitespace variant', () => {
		const columns = [makeColumn({ name: 'Contactado' })]

		const result = resolveFunnelColumnByName('Contactado ', columns)

		expect(result.rejected).toBe(true)
	})

	it('rejects an unmatched name, listing the valid active names', () => {
		const columns = [makeColumn({ name: 'Contactado' }), makeColumn({ name: 'Ganado', idLeadFunnelColumn: 2 })]

		const result = resolveFunnelColumnByName('Etapa Inexistente', columns)

		expect(result.rejected).toBe(true)
		if (result.rejected) {
			expect(result.reason).toContain('Contactado')
			expect(result.reason).toContain('Ganado')
		}
	})

	it('never imports or calls normalizeFunnelStatusKey', () => {
		const moduleSource = resolveFunnelColumnByNameModule.resolveFunnelColumnByName.toString()
		expect(moduleSource).not.toContain('normalizeFunnelStatusKey')
	})

	it('never returns a "Sin mapear" fallback column for an unmatched name', () => {
		const columns = [makeColumn({ name: 'Sin mapear', isFallback: true, idLeadFunnelColumn: 99 })]

		const result = resolveFunnelColumnByName('Etapa Inexistente', columns)

		expect(result.rejected).toBe(true)
	})
})
