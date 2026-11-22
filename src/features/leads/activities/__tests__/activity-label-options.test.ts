import { describe, expect, it } from 'vitest'
import { activityLabelOptions } from '@/features/leads/activities/activity-label-options'
import { parseActivityLabels } from '@/features/leads/activities/activity-labels-api'

describe('activityLabelOptions', () => {
	it('falls back to the five built-in names when the catalogue is empty', () => {
		expect(activityLabelOptions([]).map((option) => option.value)).toEqual(['TODO', 'CALL', 'MEETING', 'EMAIL', 'WHATSAPP'])
	})

	it('uses the catalogue name and keeps a custom label off the built-in codes', () => {
		const [custom] = activityLabelOptions([{ idLeadActivityLabel: 9, name: 'Visita', color: '#111111', code: null }])
		expect(custom).toEqual({ value: 'custom:9', name: 'Visita', code: 'TODO', idLeadActivityLabel: 9 })
	})
})

describe('parseActivityLabels', () => {
	it('drops payloads that are not activity labels', () => {
		expect(parseActivityLabels({ idLeadTask: 1 })).toEqual([])
		expect(parseActivityLabels([{ idLeadActivityLabel: 2, name: 'Llamada', color: '#0284c7', code: 'CALL' }])).toEqual([
			{ idLeadActivityLabel: 2, name: 'Llamada', color: '#0284c7', code: 'CALL' },
		])
	})
})
