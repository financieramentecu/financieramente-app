import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { AbaMfundDetailData } from '../types/aba-mfund.types'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import { ABA_MFUND_UI } from '../lib/ui-copy'

vi.mock('@/features/production-dashboard/components/HierarchySelectionContext', () => ({
	useHierarchySelection: vi.fn(),
}))

import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import { AbaMfundDetailTable } from '../components/aba-mfund-detail-table'

const mockUseHierarchySelection = vi.mocked(useHierarchySelection)

function successState(
	rows: AbaMfundDetailData['rows']
): AsyncState<AbaMfundDetailData> {
	return {
		status: 'success',
		data: { rows, nextCursor: null, hasMore: false },
		error: '',
	}
}

describe('AbaMfundDetailTable', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockUseHierarchySelection.mockReturnValue({
			selectedUserIds: [1],
			nodes: [],
			toggle: vi.fn(),
			dispatch: vi.fn(),
		} as never)
	})

	it('renders Cliente as Nombre Apellido without a hyphen', () => {
		render(
			<AbaMfundDetailTable
				state={successState([
					{
						idBusiness: 42,
						createdAt: '2026-08-10T17:00:00.000Z',
						createdAtLabel: '10 ago 2026',
						clientName: 'Ana Gómez',
						periodicityName: 'Mensual',
						status: BUSINESS_STATUS.FONDEADO,
						value: 1_000_000,
						dateIssued: null,
						dateIssuedLabel: '',
						dateAnchored: '2026-08-15T17:00:00.000Z',
						dateAnchoredLabel: '15 ago 2026',
					},
				])}
				loadMore={vi.fn()}
				isLoadingMore={false}
			/>
		)

		expect(screen.getByText(ABA_MFUND_UI.COLUMN_CLIENT)).toBeInTheDocument()
		expect(screen.getByText('Ana Gómez')).toBeInTheDocument()
		expect(screen.queryByText('Ana - Gómez')).not.toBeInTheDocument()
	})
})
