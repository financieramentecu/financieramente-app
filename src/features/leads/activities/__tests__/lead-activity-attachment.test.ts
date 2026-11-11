import { describe, expect, it } from 'vitest'
import {
	attachmentContentDisposition,
	validateActivityFiles,
} from '@/features/leads/activities/lead-activity-attachment'

describe('validateActivityFiles', () => {
	it('accepts an image and a pdf within the limit', () => {
		expect(
			validateActivityFiles([
				{ type: 'image/png', size: 100 },
				{ type: 'application/pdf', size: 4 * 1024 * 1024 },
			])
		).toEqual({ ok: true })
	})

	it('rejects a fourth file, an unknown type, and an empty file', () => {
		expect(
			validateActivityFiles([
				{ type: 'image/png', size: 1 },
				{ type: 'image/png', size: 1 },
				{ type: 'image/png', size: 1 },
				{ type: 'image/png', size: 1 },
			]).ok
		).toBe(false)
		expect(validateActivityFiles([{ type: 'application/zip', size: 10 }]).ok).toBe(false)
		expect(validateActivityFiles([{ type: 'image/png', size: 0 }]).ok).toBe(false)
	})
})

describe('attachmentContentDisposition', () => {
	it('keeps images inline and downloads documents', () => {
		expect(attachmentContentDisposition('image/png', 'foto.png')).toBe('inline; filename="foto.png"')
		expect(attachmentContentDisposition('application/pdf', 'cotización.pdf')).toBe(
			'attachment; filename="cotizaci_n.pdf"'
		)
	})
})
