import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BusinessViewModal } from '@/features/negocios/components/modals/BusinessViewModal'
import { BusinessStatusBadge } from '@/features/negocios/components/ui/BusinessStatusBadge'
import { createMockBusiness } from '@/features/negocios/__tests__/fixtures/mock-business'

describe('status presentation parity between list and detail', () => {
	it('uses the same label for LIQUIDADO in both surfaces', () => {
		const business = createMockBusiness({ status: 'LIQUIDADO' })

		render(
			<>
				{/* Represents list rendering via status code badge */}
				<BusinessStatusBadge status={business.status} />
				{/* Represents detail rendering in modal */}
				<BusinessViewModal
					open
					onOpenChange={vi.fn()}
					business={business}
				/>
			</>
		)

		expect(screen.getAllByText('Liquidado')).toHaveLength(2)
	})
})
