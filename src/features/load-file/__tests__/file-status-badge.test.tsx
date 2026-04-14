import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
	FileStatusBadge,
	type FileImportStatus,
} from '../components/ui/FileStatusBadge'

const ALL_STATUSES: FileImportStatus[] = [
	'LOAD',
	'PRE-SETTLED',
	'COMPLETED',
	'ERROR',
	'PROCESSING',
	'PARCIAL',
	'CANCELADO',
]

describe('FileStatusBadge', () => {
	it('renders distinct label and classes for LOAD vs PRE-SETTLED (REQ-7)', () => {
		const { rerender, container } = render(<FileStatusBadge status="LOAD" />)
		expect(screen.getByText('Sincronizado')).toBeInTheDocument()
		const loadBadge = container.querySelector('[class*="bg-emerald-50"]')
		expect(loadBadge).toBeTruthy()

		rerender(<FileStatusBadge status="PRE-SETTLED" />)
		expect(screen.getByText('Pre-liquidado')).toBeInTheDocument()
		const preBadge = container.querySelector('[class*="bg-amber-50"]')
		expect(preBadge).toBeTruthy()
	})

	it('renders expected label for every FileImportStatus', () => {
		const expected: Record<FileImportStatus, string> = {
			LOAD: 'Sincronizado',
			'PRE-SETTLED': 'Pre-liquidado',
			COMPLETED: 'Liquidado',
			ERROR: 'Error',
			PROCESSING: 'Procesando',
			PARCIAL: 'Parcial',
			CANCELADO: 'Cancelado',
		}
		for (const status of ALL_STATUSES) {
			const { unmount } = render(<FileStatusBadge status={status} />)
			expect(screen.getByText(expected[status])).toBeInTheDocument()
			unmount()
		}
	})

	it('does not reuse the same label for LOAD and PRE-SETTLED', () => {
		render(
			<>
				<FileStatusBadge status="LOAD" />
				<FileStatusBadge status="PRE-SETTLED" />
			</>
		)
		expect(screen.getByText('Sincronizado')).toBeInTheDocument()
		expect(screen.getByText('Pre-liquidado')).toBeInTheDocument()
		expect(screen.queryAllByText('Sincronizado')).toHaveLength(1)
	})
})
