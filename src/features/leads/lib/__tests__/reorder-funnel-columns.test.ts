import { describe, it, expect } from 'vitest'
import type { LeadFunnelColumn } from '@prisma/client'
import { reorderFunnelColumns } from '../reorder-funnel-columns'

function makeColumn(overrides: Partial<LeadFunnelColumn>): LeadFunnelColumn {
	return {
		idLeadFunnelColumn: 1,
		name: 'Nuevo',
		externalStatusKey: 'nuevo',
		position: 0,
		isFallback: false,
		active: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as LeadFunnelColumn
}

describe('reorderFunnelColumns', () => {
	it('moves the active column to the position of the over column and reassigns positions 0..n-1', () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', position: 0 }),
			makeColumn({ idLeadFunnelColumn: 2, name: 'B', position: 1 }),
			makeColumn({ idLeadFunnelColumn: 3, name: 'C', position: 2 }),
		]

		const result = reorderFunnelColumns(columns, 1, 3)

		expect(result.columns.map((c) => c.idLeadFunnelColumn)).toEqual([2, 3, 1])
		expect(result.columns.map((c) => c.position)).toEqual([0, 1, 2])
	})

	it('returns only the columns whose position actually changed', () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', position: 0 }),
			makeColumn({ idLeadFunnelColumn: 2, name: 'B', position: 1 }),
			makeColumn({ idLeadFunnelColumn: 3, name: 'C', position: 2 }),
		]

		const result = reorderFunnelColumns(columns, 1, 3)

		expect(result.changed.map((c) => c.idLeadFunnelColumn).sort()).toEqual([1, 2, 3])
	})

	it('is a no-op when activeId and overId are the same', () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', position: 0 }),
			makeColumn({ idLeadFunnelColumn: 2, name: 'B', position: 1 }),
		]

		const result = reorderFunnelColumns(columns, 1, 1)

		expect(result.columns).toBe(columns)
		expect(result.changed).toEqual([])
	})

	it('is a no-op when activeId or overId is not found', () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', position: 0 }),
			makeColumn({ idLeadFunnelColumn: 2, name: 'B', position: 1 }),
		]

		const result = reorderFunnelColumns(columns, 1, 999)

		expect(result.columns).toBe(columns)
		expect(result.changed).toEqual([])
	})

	it('does not change the position of columns unaffected by the move', () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', position: 0 }),
			makeColumn({ idLeadFunnelColumn: 2, name: 'B', position: 1 }),
			makeColumn({ idLeadFunnelColumn: 3, name: 'C', position: 2 }),
			makeColumn({ idLeadFunnelColumn: 4, name: 'D', position: 3 }),
		]

		// move A (index 0) to swap with B (index 1) only — C and D keep their position
		const result = reorderFunnelColumns(columns, 1, 2)

		const columnC = result.columns.find((c) => c.idLeadFunnelColumn === 3)
		const columnD = result.columns.find((c) => c.idLeadFunnelColumn === 4)
		expect(columnC?.position).toBe(2)
		expect(columnD?.position).toBe(3)
		expect(result.changed.map((c) => c.idLeadFunnelColumn).sort()).toEqual([1, 2])
	})
})
