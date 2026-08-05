import { describe, it, expect } from 'vitest'
import { buildComprobanteKey } from '../lib/object-key'

describe('buildComprobanteKey', () => {
	const FIXED_NOW = new Date('2026-05-14T12:00:00.000Z')
	const FIXED_UUID = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff'
	const PREFIX = 'prod'
	const CONTRACT = 'CTR-001'

	it('builds a key matching the expected format with contract pathId', () => {
		const key = buildComprobanteKey({
			prefix: PREFIX,
			pathId: CONTRACT,
			ext: 'jpg',
			now: FIXED_NOW,
			uuid: FIXED_UUID,
		})

		const ts = FIXED_NOW.getTime()
		expect(key).toBe(
			`${PREFIX}/negocios/${CONTRACT}/comprobantes/${CONTRACT}-${ts}-${FIXED_UUID}.jpg`,
		)
	})

	it('uses negocio-{id} pathId when there is no contract', () => {
		const pathId = 'negocio-42'
		const key = buildComprobanteKey({
			prefix: PREFIX,
			pathId,
			ext: 'jpg',
			now: FIXED_NOW,
			uuid: FIXED_UUID,
		})

		const ts = FIXED_NOW.getTime()
		expect(key).toBe(
			`${PREFIX}/negocios/${pathId}/comprobantes/${pathId}-${ts}-${FIXED_UUID}.jpg`,
		)
	})

	it('uses the provided ext in the filename', () => {
		const key = buildComprobanteKey({
			prefix: 'staging',
			pathId: 'ABC-123',
			ext: 'png',
			now: FIXED_NOW,
			uuid: FIXED_UUID,
		})
		expect(key).toMatch(/\.png$/)
	})

	it('includes pathId in directory and filename', () => {
		const key = buildComprobanteKey({
			prefix: PREFIX,
			pathId: 'MY-CONTRACT',
			ext: 'webp',
			now: FIXED_NOW,
			uuid: FIXED_UUID,
		})
		expect(key).toContain('/negocios/MY-CONTRACT/')
		expect(key).toContain('/MY-CONTRACT-')
	})

	it('uses timestamp from now param', () => {
		const now1 = new Date('2026-01-01T00:00:00.000Z')
		const now2 = new Date('2026-06-01T00:00:00.000Z')
		const key1 = buildComprobanteKey({
			prefix: PREFIX,
			pathId: CONTRACT,
			ext: 'jpg',
			now: now1,
			uuid: FIXED_UUID,
		})
		const key2 = buildComprobanteKey({
			prefix: PREFIX,
			pathId: CONTRACT,
			ext: 'jpg',
			now: now2,
			uuid: FIXED_UUID,
		})
		expect(key1).not.toBe(key2)
		expect(key1).toContain(String(now1.getTime()))
		expect(key2).toContain(String(now2.getTime()))
	})

	it('uses uuid param in the filename', () => {
		const uuid1 = '11111111-1111-1111-1111-111111111111'
		const uuid2 = '22222222-2222-2222-2222-222222222222'
		const key1 = buildComprobanteKey({
			prefix: PREFIX,
			pathId: CONTRACT,
			ext: 'jpg',
			now: FIXED_NOW,
			uuid: uuid1,
		})
		const key2 = buildComprobanteKey({
			prefix: PREFIX,
			pathId: CONTRACT,
			ext: 'jpg',
			now: FIXED_NOW,
			uuid: uuid2,
		})
		expect(key1).toContain(uuid1)
		expect(key2).toContain(uuid2)
	})
})
