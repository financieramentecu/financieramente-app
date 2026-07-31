import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BusinessViewModal } from '@/features/negocios/components/modals/BusinessViewModal'
import { BusinessStatusBadge } from '@/features/negocios/components/ui/BusinessStatusBadge'
import { createMockBusiness } from '@/features/negocios/__tests__/fixtures/mock-business'
import DetalleNegocioPage from '@/app/dashboard/negocios/[id]/page'

vi.mock('@/auth', () => ({
	auth: vi.fn(async () => ({ user: { email: 'test@financieramente.com' } })),
}))

vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(async () => ({
		id: 1,
		name: 'Test User',
		email: 'test@financieramente.com',
		role: { name: 'ADMIN' },
	})),
}))

vi.mock('@/features/negocios/services/business-get-by-id.server', () => ({
	getBusinessById: vi.fn(async () => ({ id: 1 })),
}))

vi.mock('@/features/shared/layout/DashboardLayout', () => ({
	DashboardLayout: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}))

vi.mock('@/features/business-supports/components/ViewSupportsButton', () => ({
	ViewSupportsButton: () => null,
}))

vi.mock('@/features/business-supports/components/UploadSupportButton', () => ({
	UploadSupportButton: () => null,
}))

vi.mock('@/features/comments/components/CommentsSidebar', () => ({
	CommentsSidebar: () => null,
}))

vi.mock('@/features/shared/lib/format-date', () => ({
	formatDateBogota: (d: string | null | undefined) => (d ? `formatted:${d}` : '—'),
}))

vi.mock('@/features/negocios/mappers/business-entity.mapper', () => ({
	prismaBusinessToEntity: vi.fn(),
}))

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

	it('renders the novedad badge, marked date, and mark/unmark button in BusinessViewModal', () => {
		const business = createMockBusiness({
			status: 'VENTA_EFECTUADA',
			novedadStatus: 'PENDIENTE',
			novedadMarkedAt: '2026-07-30T12:00:00.000Z',
		})

		render(<BusinessViewModal open onOpenChange={vi.fn()} business={business} />)

		expect(screen.getByText('Novedad Pendiente')).toBeInTheDocument()
		expect(screen.getByText('formatted:2026-07-30T12:00:00.000Z')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /desmarcar novedad/i })).toBeInTheDocument()
	})

	it('renders the novedad badge, marked date, and mark/unmark button in the detail page', async () => {
		const { prismaBusinessToEntity } = await import(
			'@/features/negocios/mappers/business-entity.mapper'
		)
		vi.mocked(prismaBusinessToEntity).mockReturnValue(
			createMockBusiness({
				status: 'VENTA_EFECTUADA',
				novedadStatus: 'PENDIENTE',
				novedadMarkedAt: '2026-07-30T12:00:00.000Z',
			})
		)

		const jsx = await DetalleNegocioPage({
			params: Promise.resolve({ id: '1' }),
			searchParams: Promise.resolve({}),
		})

		render(jsx)

		expect(screen.getByText('Novedad Pendiente')).toBeInTheDocument()
		expect(screen.getByText('formatted:2026-07-30T12:00:00.000Z')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /desmarcar novedad/i })).toBeInTheDocument()
	})
})
