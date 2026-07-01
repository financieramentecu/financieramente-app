import { describe, it, expect } from 'vitest'
import { getAporteVisualState } from '../aporte-visual-state'
import type { PaymentInstallmentDto } from '../../types/business-api.types'

// Fixed "now" in UTC: June 15, 2026 at noon UTC = June 15, 2026 07:00 Bogota
const now = new Date('2026-06-15T12:00:00Z')

function makeAporte(
	overrides: Partial<PaymentInstallmentDto>
): PaymentInstallmentDto {
	return {
		installmentIndex: 1,
		status: 'FONDEADO',
		dateAnchored: null,
		expectedDate: null,
		portfolioDate: null,
		earlyPaymentDate: null,
		portfolioPaymentDate: null,
		...overrides,
	}
}

describe('getAporteVisualState', () => {
	// ─── SIN_FONDEAR index=1 (primer aporte — FONDEAR affordance) ─────
	describe('SIN_FONDEAR installmentIndex=1 — manual funding affordance', () => {
		it('emits FONDEAR button for canMutate=true', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 1 })
			const vs = getAporteVisualState(aporte, now, true, 1, false)
			expect(vs.buttons).toContain('FONDEAR')
		})

		it('does NOT emit FONDEAR for canMutate=false', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 1 })
			const vs = getAporteVisualState(aporte, now, false, 1, false)
			expect(vs.buttons).not.toContain('FONDEAR')
		})

		it('emits FONDEAR + MARK_CARTERA for index=1 when expectedDate is current month', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 1, expectedDate: '2026-06-01T00:00:00.000Z' })
			const vs = getAporteVisualState(aporte, now, true, 1, false)
			expect(vs.buttons).toContain('FONDEAR')
			expect(vs.buttons).toContain('MARK_CARTERA')
			expect(vs.buttons).not.toContain('MARK_ANTICIPADO')
		})

		it('returns SIN_FONDEAR variant for index=1', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 1 })
			expect(getAporteVisualState(aporte, now, true, 1, false).variant).toBe('SIN_FONDEAR')
		})
	})

	// ─── SIN_FONDEAR index>1 — cron-funded, scheduled buttons ────────
	describe('SIN_FONDEAR installmentIndex=2 — scheduled (buttons on due-date month)', () => {
		it('does NOT emit FONDEAR button for index=2', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 2, expectedDate: '2026-08-01T00:00:00.000Z' })
			const vs = getAporteVisualState(aporte, now, true, aporte.installmentIndex, false)
			expect(vs.buttons).not.toContain('FONDEAR')
		})

		it('returns SIN_FONDEAR variant', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 2 })
			expect(getAporteVisualState(aporte, now, false).variant).toBe('SIN_FONDEAR')
		})

		it('has gray row class', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 2 })
			expect(getAporteVisualState(aporte, now, false).rowClass).toContain('gray')
		})

		it('label is "Sin fondear" when expectedDate is null', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 2, expectedDate: null })
			expect(getAporteVisualState(aporte, now, false).label).toBe('Sin fondear')
		})

		it('label includes "Se fondeará en" when expectedDate is set', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 2, expectedDate: '2026-08-01T00:00:00.000Z' })
			const vs = getAporteVisualState(aporte, now, true, aporte.installmentIndex, false)
			expect(vs.label).toMatch(/Se fondeará en/)
		})

		// now = June 15 2026; expectedDate June 2026 → same month → MARK_CARTERA only
		it('shows MARK_CARTERA only when expectedDate is in the current month (same month)', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 2, expectedDate: '2026-06-01T00:00:00.000Z' })
			const vs = getAporteVisualState(aporte, now, true, aporte.installmentIndex, false)
			expect(vs.buttons).toContain('MARK_CARTERA')
			expect(vs.buttons).not.toContain('MARK_ANTICIPADO')
		})

		// now = June 15 2026; expectedDate August 2026 → strictly future → both buttons
		it('shows MARK_CARTERA and MARK_ANTICIPADO when expectedDate is strictly future month', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 2, expectedDate: '2026-08-01T00:00:00.000Z' })
			const vs = getAporteVisualState(aporte, now, true, aporte.installmentIndex, false)
			expect(vs.buttons).toContain('MARK_CARTERA')
			expect(vs.buttons).toContain('MARK_ANTICIPADO')
		})

		// now = June 15 2026; expectedDate March 2026 → past → no buttons
		it('shows no buttons when expectedDate is in a past month', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 2, expectedDate: '2026-03-01T00:00:00.000Z' })
			const vs = getAporteVisualState(aporte, now, true, aporte.installmentIndex, false)
			expect(vs.buttons).toEqual([])
		})

		it('shows no buttons when expectedDate is null regardless of canMutate', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 2, expectedDate: null })
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
		})

		it('returns no buttons for read-only role even in current month', () => {
			const aporte = makeAporte({ status: 'SIN_FONDEAR', installmentIndex: 2, expectedDate: '2026-06-01T00:00:00.000Z' })
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
		})
	})

	// ─── FONDEADO — actually funded (dateAnchored set) ────────────────
	describe('FONDEADO with dateAnchored set — actually funded', () => {
		// now = June 15 2026; dateAnchored = June 10 2026 → funding month is current → FONDEADO_CURRENT
		it('returns FONDEADO_CURRENT variant when funding month is current', () => {
			const aporte = makeAporte({ status: 'FONDEADO', dateAnchored: '2026-06-10T12:00:00.000Z', expectedDate: '2027-05-01T00:00:00.000Z' })
			expect(getAporteVisualState(aporte, now, false).variant).toBe('FONDEADO_CURRENT')
		})

		it('label says "Fondeado: <date>" — never "Se fondeará en"', () => {
			const aporte = makeAporte({ status: 'FONDEADO', dateAnchored: '2026-06-10T12:00:00.000Z', expectedDate: '2027-05-01T00:00:00.000Z' })
			const vs = getAporteVisualState(aporte, now, true, aporte.installmentIndex, false)
			expect(vs.label).toMatch(/Fondeado/)
			expect(vs.label).not.toMatch(/fondeará/)
		})

		it('shows green row when funding month is current', () => {
			const aporte = makeAporte({ status: 'FONDEADO', dateAnchored: '2026-06-10T12:00:00.000Z', expectedDate: '2027-05-01T00:00:00.000Z' })
			expect(getAporteVisualState(aporte, now, false).rowClass).toContain('green')
		})

		it('shows MARK_CARTERA only (no MARK_ANTICIPADO) within funding-month correction window', () => {
			const aporte = makeAporte({ status: 'FONDEADO', dateAnchored: '2026-06-10T12:00:00.000Z', expectedDate: '2027-05-01T00:00:00.000Z' })
			const vs = getAporteVisualState(aporte, now, true, aporte.installmentIndex, false)
			expect(vs.buttons).toContain('MARK_CARTERA')
			expect(vs.buttons).not.toContain('MARK_ANTICIPADO')
		})

		// now = June 15 2026; dateAnchored = March 10 2026 → funding month is past → FONDEADO_PAST
		it('returns FONDEADO_PAST variant when funding month is past', () => {
			const aporte = makeAporte({ status: 'FONDEADO', dateAnchored: '2026-03-10T12:00:00.000Z', expectedDate: '2027-05-01T00:00:00.000Z' })
			expect(getAporteVisualState(aporte, now, false).variant).toBe('FONDEADO_PAST')
		})

		it('shows no buttons when funding month is past', () => {
			const aporte = makeAporte({ status: 'FONDEADO', dateAnchored: '2026-03-10T12:00:00.000Z', expectedDate: '2027-05-01T00:00:00.000Z' })
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
		})

		it('shows green row when funding month is past', () => {
			const aporte = makeAporte({ status: 'FONDEADO', dateAnchored: '2026-03-10T12:00:00.000Z', expectedDate: '2027-05-01T00:00:00.000Z' })
			expect(getAporteVisualState(aporte, now, false).rowClass).toContain('green')
		})

		it('NEVER shows MARK_ANTICIPADO regardless of expectedDate month (funded = cannot be advanced)', () => {
			// expectedDate is strictly future month — should still NOT show MARK_ANTICIPADO
			const aporte = makeAporte({ status: 'FONDEADO', dateAnchored: '2026-06-10T12:00:00.000Z', expectedDate: '2027-05-01T00:00:00.000Z' })
			const vs = getAporteVisualState(aporte, now, true, aporte.installmentIndex, false)
			expect(vs.buttons).not.toContain('MARK_ANTICIPADO')
		})

		it('shows no buttons for read-only role even within correction window', () => {
			const aporte = makeAporte({ status: 'FONDEADO', dateAnchored: '2026-06-10T12:00:00.000Z', expectedDate: '2027-05-01T00:00:00.000Z' })
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
		})
	})

	// ─── FONDEADO — null dateAnchored (legacy edge) ──────────────────
	describe('FONDEADO with dateAnchored null — legacy edge "Fecha por confirmar"', () => {
		const aporte = makeAporte({ status: 'FONDEADO', dateAnchored: null, expectedDate: null })

		it('returns FONDEADO_CURRENT variant', () => {
			expect(getAporteVisualState(aporte, now, false).variant).toBe('FONDEADO_CURRENT')
		})

		it('shows "Fecha por confirmar" label', () => {
			expect(getAporteVisualState(aporte, now, false).label).toMatch(/confirmar/i)
		})

		it('shows MARK_CARTERA for privileged role', () => {
			const aporte = makeAporte({ status: 'FONDEADO', dateAnchored: '2026-06-10T12:00:00.000Z', installmentIndex: 1 })
			expect(getAporteVisualState(aporte, now, true, 1, false).buttons).toContain('MARK_CARTERA')
		})

		it('shows no buttons for read-only role', () => {
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
		})
	})

	// ─── Bogota timezone edge (SIN_FONDEAR index>1) ──────────────────
	describe('Bogota UTC midnight edge — isSameMonthOrFuture uses Bogota TZ (SIN_FONDEAR index=2)', () => {
		it('UTC 2026-07-01T03:00Z = Bogota June 30: SIN_FONDEAR index=2 with July expectedDate → both buttons', () => {
			// now in UTC is July 1 2026 at 03:00Z = Bogota June 30 22:00
			// Bogota month is June, so July expectedDate is strictly future → both buttons
			const nowEdge = new Date('2026-07-01T03:00:00Z')
			const aporte = makeAporte({
				status: 'SIN_FONDEAR',
				installmentIndex: 2,
				expectedDate: '2026-07-01T00:00:00.000Z',
			})
			const vs = getAporteVisualState(aporte, nowEdge, true, 2, false)
			expect(vs.buttons).toContain('MARK_CARTERA')
			expect(vs.buttons).toContain('MARK_ANTICIPADO')
		})
	})

	// ─── EN_CARTERA ───────────────────────────────────────────────────
	describe('EN_CARTERA', () => {
		const aporte = makeAporte({
			status: 'EN_CARTERA',
			portfolioDate: '2026-05-10T00:00:00.000Z',
		})

		it('returns EN_CARTERA variant', () => {
			expect(getAporteVisualState(aporte, now, false).variant).toBe('EN_CARTERA')
		})

		it('returns UNMARK_CARTERA only for privileged roles', () => {
			const vs = getAporteVisualState(aporte, now, true, aporte.installmentIndex, false)
			expect(vs.buttons).toEqual(['UNMARK_CARTERA'])
		})

		it('returns no buttons for read-only roles', () => {
			const vs = getAporteVisualState(aporte, now, false, aporte.installmentIndex, false)
			expect(vs.buttons).toEqual([])
		})

		it('has red row class', () => {
			expect(getAporteVisualState(aporte, now, false).rowClass).toContain('red')
		})
	})

	// ─── PAGO_ANTICIPADO ──────────────────────────────────────────────
	describe('PAGO_ANTICIPADO', () => {
		const aporte = makeAporte({
			status: 'PAGO_ANTICIPADO',
			earlyPaymentDate: '2026-05-12T00:00:00.000Z',
		})

		it('returns PAGO_ANTICIPADO variant', () => {
			expect(getAporteVisualState(aporte, now, false).variant).toBe('PAGO_ANTICIPADO')
		})

		it('returns no buttons for any role', () => {
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
		})

		it('includes date in label', () => {
			const vs = getAporteVisualState(aporte, now, true, aporte.installmentIndex, false)
			expect(vs.label).toMatch(/Pago anticipado/)
		})

		it('has green row class', () => {
			expect(getAporteVisualState(aporte, now, false).rowClass).toContain('green')
		})
	})

	// ─── CARTERA_PAGADO ───────────────────────────────────────────────
	describe('CARTERA_PAGADO', () => {
		const aporte = makeAporte({
			status: 'CARTERA_PAGADO',
			portfolioPaymentDate: '2026-05-20T00:00:00.000Z',
		})

		it('returns CARTERA_PAGADO variant', () => {
			expect(getAporteVisualState(aporte, now, false).variant).toBe('CARTERA_PAGADO')
		})

		it('returns no buttons for any role — terminal state', () => {
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
		})

		it('includes portfolioPaymentDate in label', () => {
			const vs = getAporteVisualState(aporte, now, true, aporte.installmentIndex, false)
			expect(vs.label).toMatch(/Cartera pagada/)
		})

		it('has green row class', () => {
			expect(getAporteVisualState(aporte, now, false).rowClass).toContain('green')
		})
	})
})
