import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NovedadActionButton } from '../../../components/ui/NovedadActionButton'

vi.mock('next/navigation', () => ({
	useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('../../../hooks/use-mark-novedad', () => ({
	useMarkNovedad: () => ({
		state: { status: 'idle', data: undefined, error: '' },
		mark: vi.fn(),
		unmark: vi.fn(),
	}),
}))

describe('NovedadActionButton — NUEVA-based gate (task 8)', () => {
	it('shows "Marcar Con Novedad" when novedadStatus is null and business is VENTA_EFECTUADA (canMark)', () => {
		render(
			<NovedadActionButton
				businessId={1}
				businessStatus="VENTA_EFECTUADA"
				novedadStatus={null}
			/>
		)
		expect(screen.getByText('Marcar Con Novedad')).toBeInTheDocument()
	})

	it('shows "Desmarcar Novedad" when novedadStatus is NUEVA (canUnmark), not PENDIENTE', () => {
		render(
			<NovedadActionButton
				businessId={1}
				businessStatus="VENTA_EFECTUADA"
				novedadStatus="NUEVA"
			/>
		)
		expect(screen.getByText('Desmarcar Novedad')).toBeInTheDocument()
	})

	it('renders nothing when novedadStatus is PENDIENTE (backoffice-managed, not self-service unmark)', () => {
		const { container } = render(
			<NovedadActionButton
				businessId={1}
				businessStatus="VENTA_EFECTUADA"
				novedadStatus="PENDIENTE"
			/>
		)
		expect(container).toBeEmptyDOMElement()
	})

	it('renders nothing when novedadStatus is SOMETIDA_DEVOLUCION (backoffice-managed)', () => {
		const { container } = render(
			<NovedadActionButton
				businessId={1}
				businessStatus="VENTA_EFECTUADA"
				novedadStatus="SOMETIDA_DEVOLUCION"
			/>
		)
		expect(container).toBeEmptyDOMElement()
	})

	it('renders nothing when business is not VENTA_EFECTUADA and there is no novedad', () => {
		const { container } = render(
			<NovedadActionButton
				businessId={1}
				businessStatus="EMITIDO"
				novedadStatus={null}
			/>
		)
		expect(container).toBeEmptyDOMElement()
	})
})
