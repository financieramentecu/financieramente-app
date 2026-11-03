import { describe, expect, it } from 'vitest'
import {
	buildPipelineWhere,
	NO_PIPELINE,
	togglePipeline,
} from '../lib/pipeline-filter'

const ALL = ['Ventas', 'Estudiantes', 'Skool']

describe('buildPipelineWhere', () => {
	it('returns null for an empty selection (all pipelines)', () => {
		expect(buildPipelineWhere([])).toBeNull()
	})

	it('filters by name', () => {
		expect(buildPipelineWhere(['Ventas', 'Skool'])).toEqual({
			originTag: { in: ['Ventas', 'Skool'] },
		})
	})

	it('maps the sentinel to leads without a pipeline', () => {
		expect(buildPipelineWhere([NO_PIPELINE])).toEqual({ originTag: null })
		expect(buildPipelineWhere(['Ventas', NO_PIPELINE])).toEqual({
			OR: [{ originTag: { in: ['Ventas'] } }, { originTag: null }],
		})
	})
})

describe('togglePipeline', () => {
	it('isolates the clicked pipeline when everything was on', () => {
		expect(togglePipeline(null, 'Skool', ALL)).toEqual(['Skool'])
	})

	it('removes a pipeline from a partial selection', () => {
		expect(togglePipeline(['Ventas', 'Skool'], 'Skool', ALL)).toEqual(['Ventas'])
	})

	it('returns to "all" once every pipeline is on again', () => {
		expect(togglePipeline(['Ventas', 'Estudiantes'], 'Skool', ALL)).toBeNull()
	})

	it('never leaves the selection empty', () => {
		expect(togglePipeline(['Ventas'], 'Ventas', ALL)).toEqual(['Ventas'])
	})
})
