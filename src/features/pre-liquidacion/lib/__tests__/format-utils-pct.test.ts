import { describe, it, expect, vi } from 'vitest'
import { formatPercentDisplay } from '@/features/shared/lib/format-percent'
import { formatPct } from '../format-utils'

vi.mock('@/features/shared/lib/app-locale', () => ({
	getAppLocale: () => 'es-CO',
}))

describe('formatPct', () => {
	it('delegates to formatPercentDisplay with fraction × 100 (cross-module RF-01)', () => {
		expect(formatPct(0.1234)).toBe(formatPercentDisplay(12.34, 'es-CO'))
		expect(formatPct(0)).toBe(formatPercentDisplay(0, 'es-CO'))
	})
})
