import { describe, expect, it } from 'vitest'
import {
	MFUND_PERIODICITY_ERROR,
	MFUND_REQUIRED_PERIODICITY,
	mfundPeriodicityError,
} from '../mfund-periodicity'

describe('mfundPeriodicityError', () => {
	it('rejects SKANDIA + MFUND with a periodicity other than Aportes Ocasionales', () => {
		expect(
			mfundPeriodicityError({
				companyName: 'SKANDIA',
				productName: 'MFUND',
				periodicityName: 'Mensual',
			})
		).toBe(MFUND_PERIODICITY_ERROR)
	})

	it('rejects SKANDIA + MFUND when periodicity is missing', () => {
		expect(
			mfundPeriodicityError({
				companyName: 'SKANDIA',
				productName: 'MFUND',
				periodicityName: null,
			})
		).toBe(MFUND_PERIODICITY_ERROR)
	})

	it('allows SKANDIA + MFUND with Aportes Ocasionales', () => {
		expect(
			mfundPeriodicityError({
				companyName: 'SKANDIA',
				productName: 'MFUND',
				periodicityName: MFUND_REQUIRED_PERIODICITY,
			})
		).toBeNull()
	})

	it('allows another SKANDIA product to keep its periodicity', () => {
		expect(
			mfundPeriodicityError({
				companyName: 'SKANDIA',
				productName: 'CES',
				periodicityName: 'Mensual',
			})
		).toBeNull()
	})

	it('allows MFUND under another company', () => {
		expect(
			mfundPeriodicityError({
				companyName: 'TRINITY',
				productName: 'MFUND',
				periodicityName: 'Anual',
			})
		).toBeNull()
	})
})
