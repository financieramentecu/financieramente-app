import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LeadCsvImportPanel } from '../lead-csv-import-panel'
import { useLeadCsvImport } from '@/features/leads/hooks/use-lead-csv-import'
import type { LeadCsvImportSummary } from '@/features/leads/types/lead-csv-import.types'

vi.mock('@/features/leads/hooks/use-lead-csv-import', () => ({
	useLeadCsvImport: vi.fn(),
}))

const SUMMARY_WITH_ALL_CASES: LeadCsvImportSummary = {
	totalRows: 4,
	imported: 3,
	created: 2,
	updated: 1,
	rejected: [{ rowNumber: 5, reason: 'estado "en_revision" no reconocido' }],
	ownerlessLeads: [
		{ rowNumber: 3, externalCrmId: 'CRM-3', reason: 'EMAIL_UNMATCHED', ownerEmail: 'noexiste@x.com' },
	],
	wonLockedLeads: [{ rowNumber: 2, externalCrmId: 'CRM-2', attemptedStatus: 'LOST' }],
}

const SUMMARY_WITH_ALL_OWNERLESS_REASONS: LeadCsvImportSummary = {
	totalRows: 4,
	imported: 4,
	created: 4,
	updated: 0,
	rejected: [],
	ownerlessLeads: [
		{ rowNumber: 2, externalCrmId: 'CRM-10', reason: 'EMAIL_UNMATCHED', ownerEmail: 'noexiste@x.com' },
		{ rowNumber: 3, externalCrmId: 'CRM-11', reason: 'NAME_UNMATCHED', ownerName: 'Nadie Existente' },
		{
			rowNumber: 4,
			externalCrmId: 'CRM-12',
			reason: 'NAME_AMBIGUOUS',
			ownerName: 'Juan Perez',
			candidateCount: 2,
		},
		{ rowNumber: 5, externalCrmId: 'CRM-13', reason: 'NO_OWNER_PROVIDED' },
	],
	wonLockedLeads: [],
}

describe('LeadCsvImportPanel', () => {
	beforeEach(() => vi.clearAllMocks())

	it('renders the download and upload controls', () => {
		vi.mocked(useLeadCsvImport).mockReturnValue({
			state: { status: 'idle', data: undefined, error: '' },
			importFile: vi.fn(),
		})

		render(<LeadCsvImportPanel />)

		expect(screen.getByRole('link', { name: /descargar plantilla/i })).toBeInTheDocument()
		expect(screen.getByLabelText(/subir archivo csv/i)).toBeInTheDocument()
	})

	it('renders rejected rows, ownerless leads, and WON-locked leads distinctly after a successful upload', () => {
		vi.mocked(useLeadCsvImport).mockReturnValue({
			state: { status: 'success', data: SUMMARY_WITH_ALL_CASES, error: '' },
			importFile: vi.fn(),
		})

		render(<LeadCsvImportPanel />)

		expect(screen.getByText(/en_revision/)).toBeInTheDocument()
		expect(screen.getByText(/CRM-3/)).toBeInTheDocument()
		expect(screen.getByText(/CRM-2/)).toBeInTheDocument()
		expect(screen.getByText(/3 importados/i)).toBeInTheDocument()
	})

	it('renders a distinct Spanish label per ownerless reason, never collapsing the four into one message', () => {
		vi.mocked(useLeadCsvImport).mockReturnValue({
			state: { status: 'success', data: SUMMARY_WITH_ALL_OWNERLESS_REASONS, error: '' },
			importFile: vi.fn(),
		})

		render(<LeadCsvImportPanel />)

		expect(screen.getByText(/noexiste@x.com/)).toBeInTheDocument()
		expect(screen.getByText(/Nadie Existente/)).toBeInTheDocument()
		expect(screen.getByText(/Juan Perez/)).toBeInTheDocument()
		expect(screen.getByText(/2 coincidencias/)).toBeInTheDocument()
		expect(screen.getByText(/CRM-13/)).toBeInTheDocument()
		expect(screen.getByText(/sin propietario indicado/)).toBeInTheDocument()

		const listItems = screen
			.getAllByRole('listitem')
			.map((item) => item.textContent ?? '')
			.filter((text) => text.includes('CRM-1'))
		const uniqueTexts = new Set(listItems)
		expect(uniqueTexts.size).toBe(listItems.length)
	})

	it('shows an error message when the import fails', () => {
		vi.mocked(useLeadCsvImport).mockReturnValue({
			state: { status: 'error', data: undefined, error: 'Encabezados inválidos' },
			importFile: vi.fn(),
		})

		render(<LeadCsvImportPanel />)

		expect(screen.getByText('Encabezados inválidos')).toBeInTheDocument()
	})
})
