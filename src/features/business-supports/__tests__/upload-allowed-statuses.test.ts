import { describe, it, expect } from 'vitest'
import {
	UPLOAD_ALLOWED_STATUSES,
	isUploadAllowedStatus,
	comprobantePathId,
} from '../lib/upload-allowed-statuses'

describe('UPLOAD_ALLOWED_STATUSES', () => {
	it('includes VENTA_EFECTUADA, EMITIDO, and FONDEADO', () => {
		expect(UPLOAD_ALLOWED_STATUSES).toEqual([
			'VENTA_EFECTUADA',
			'EMITIDO',
			'FONDEADO',
		])
	})

	it('isUploadAllowedStatus accepts allowed statuses', () => {
		expect(isUploadAllowedStatus('VENTA_EFECTUADA')).toBe(true)
		expect(isUploadAllowedStatus('EMITIDO')).toBe(true)
		expect(isUploadAllowedStatus('FONDEADO')).toBe(true)
	})

	it('isUploadAllowedStatus rejects disallowed statuses', () => {
		expect(isUploadAllowedStatus('CANCELADO')).toBe(false)
		expect(isUploadAllowedStatus('CARTERA')).toBe(false)
		expect(isUploadAllowedStatus(null)).toBe(false)
		expect(isUploadAllowedStatus(undefined)).toBe(false)
	})
})

describe('comprobantePathId', () => {
	it('returns contract when present', () => {
		expect(comprobantePathId('CTR-001', 42)).toBe('CTR-001')
	})

	it('returns negocio-{id} when contract is null', () => {
		expect(comprobantePathId(null, 42)).toBe('negocio-42')
	})
})
