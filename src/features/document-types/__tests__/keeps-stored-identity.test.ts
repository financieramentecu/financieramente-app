import { describe, expect, it } from 'vitest'
import { keepsStoredIdentity } from '@/features/document-types/lib/keeps-stored-identity'

describe('keepsStoredIdentity', () => {
	it('is true when type and number are unchanged, including legacy punctuation', () => {
		expect(
			keepsStoredIdentity({
				identityNumber: '1.234.567',
				typeIdentity: 'CC',
				storedIdentityNumber: '1.234.567',
				storedTypeIdentity: 'cc',
			})
		).toBe(true)
	})

	it('is false when the number changes', () => {
		expect(
			keepsStoredIdentity({
				identityNumber: '1234567',
				typeIdentity: 'CC',
				storedIdentityNumber: '1.234.567',
				storedTypeIdentity: 'CC',
			})
		).toBe(false)
	})

	it('is false when the document type changes', () => {
		expect(
			keepsStoredIdentity({
				identityNumber: '1.234.567',
				typeIdentity: 'CE',
				storedIdentityNumber: '1.234.567',
				storedTypeIdentity: 'CC',
			})
		).toBe(false)
	})

	it('is false when there is no stored identity to compare', () => {
		expect(
			keepsStoredIdentity({
				identityNumber: '1.234.567',
				typeIdentity: 'CC',
			})
		).toBe(false)
	})
})
