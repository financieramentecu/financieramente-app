import { describe, expect, it } from 'vitest'
import {
	InvalidProductIdError,
	parseRemediationArgs,
} from '@/features/product/lib/remediation-cli-args'

describe('parseRemediationArgs', () => {
	it('leaves productId unset when the flag is omitted', () => {
		expect(parseRemediationArgs(['--apply'])).toEqual({
			apply: true,
		})
	})

	it('reads a positive product id', () => {
		expect(parseRemediationArgs(['--product-id=93'])).toEqual({
			apply: false,
			productId: 93,
		})
	})

	it.each(['0', '-1', '1.5', 'abc', '', '00'])(
		'rejects --product-id=%s instead of targeting every product',
		(raw) => {
			expect(() =>
				parseRemediationArgs([`--product-id=${raw}`, '--apply'])
			).toThrow(InvalidProductIdError)
		}
	)

	it('rejects a bare --product-id flag', () => {
		expect(() => parseRemediationArgs(['--product-id', '--apply'])).toThrow(
			InvalidProductIdError
		)
	})
})
