import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NovedadManageTrigger } from '../../../components/ui/NovedadManageTrigger'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
	useRouter: () => ({ refresh: mockRefresh }),
}))

vi.mock('sonner', () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}))

describe('NovedadManageTrigger — role-gated visibility (task 11)', () => {
	it('renders the trigger for ANALISTA_SOPORTE when novedadStatus is non-null', () => {
		render(
			<NovedadManageTrigger
				businessId={1}
				novedadStatus="NUEVA"
				userRoleCode="ANALISTA_SOPORTE"
			/>
		)
		expect(screen.getByRole('button', { name: /Gestionar Novedad/i })).toBeInTheDocument()
	})

	it('renders the trigger for ADMIN when novedadStatus is non-null', () => {
		render(
			<NovedadManageTrigger businessId={1} novedadStatus="PENDIENTE" userRoleCode="ADMIN" />
		)
		expect(screen.getByRole('button', { name: /Gestionar Novedad/i })).toBeInTheDocument()
	})

	it.each(['AGENTE', 'ASISTENTE_GERENCIA_OPERATIVA'])(
		'renders nothing for role %s',
		(role) => {
			const { container } = render(
				<NovedadManageTrigger businessId={1} novedadStatus="NUEVA" userRoleCode={role} />
			)
			expect(container).toBeEmptyDOMElement()
		}
	)

	it('renders nothing when novedadStatus is null, even for ADMIN', () => {
		const { container } = render(
			<NovedadManageTrigger businessId={1} novedadStatus={null} userRoleCode="ADMIN" />
		)
		expect(container).toBeEmptyDOMElement()
	})

	it('opens the modal on click and refreshes the router on confirm', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: { id: 1, novedadStatus: 'DECLINADA' } }),
		})

		render(
			<NovedadManageTrigger businessId={1} novedadStatus="NUEVA" userRoleCode="ADMIN" />
		)

		fireEvent.click(screen.getByRole('button', { name: /Gestionar Novedad/i }))

		expect(await screen.findByRole('dialog')).toBeInTheDocument()
	})
})
