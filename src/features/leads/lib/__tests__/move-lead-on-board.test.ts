import { describe, expect, it } from 'vitest'
import { moveLeadOnBoard, restoreLeadIfStillInColumn } from '@/features/leads/lib/move-lead-on-board'
import type { LeadBoardColumn } from '@/features/leads/types/lead.types'

const lead = (idLead: number): LeadBoardColumn['leads'][number] => ({
	idLead,
	name: `Lead ${idLead}`,
	lastName: null,
	email: null,
	phone: null,
	originTag: null,
	idUser: null,
	ownerName: null,
	outcomeStatus: 'OPEN',
	idBusiness: null,
})

function columns(): LeadBoardColumn[] {
	return [
		{ idLeadFunnelColumn: 1, name: 'Nuevo', position: 1, isFallback: false, leads: [lead(10), lead(11)] },
		{ idLeadFunnelColumn: 2, name: 'Contactado', position: 2, isFallback: false, leads: [lead(20)] },
	]
}

describe('moveLeadOnBoard', () => {
	it('places the card at the top of the destination and removes it from the origin', () => {
		const next = moveLeadOnBoard(columns(), 10, 2)
		expect(next?.[0].leads.map((item) => item.idLead)).toEqual([11])
		expect(next?.[1].leads.map((item) => item.idLead)).toEqual([10, 20])
	})

	it('returns null when the card is already in that column or the column does not exist', () => {
		expect(moveLeadOnBoard(columns(), 10, 1)).toBeNull()
		expect(moveLeadOnBoard(columns(), 10, 9)).toBeNull()
		expect(moveLeadOnBoard(columns(), 99, 2)).toBeNull()
	})
})

describe('restoreLeadIfStillInColumn', () => {
	it('sends the card home when it is still in the column that failed to save', () => {
		const moved = moveLeadOnBoard(columns(), 10, 2)!
		const restored = restoreLeadIfStillInColumn(moved, 10, 2, 1)
		expect(restored[0].leads.map((item) => item.idLead)).toEqual([10, 11])
		expect(restored[1].leads.map((item) => item.idLead)).toEqual([20])
	})

	it('leaves a later drop alone when the card is no longer in the failed column', () => {
		const moved = moveLeadOnBoard(columns(), 10, 2)!
		expect(restoreLeadIfStillInColumn(moved, 10, 3, 1)).toBe(moved)
	})
})
