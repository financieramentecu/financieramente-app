import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { DefaultDistributionEditor } from '../components/default-distribution-editor'

describe('DefaultDistributionEditor loading', () => {
	afterEach(() => vi.unstubAllGlobals())

	it('shows a labelled form skeleton while the percentages load', () => {
		vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
		render(<DefaultDistributionEditor />)

		expect(screen.getByRole('status', { name: 'Cargando porcentajes' })).toBeInTheDocument()
		expect(screen.queryByText('Cargando porcentajes...')).not.toBeInTheDocument()
	})
})
