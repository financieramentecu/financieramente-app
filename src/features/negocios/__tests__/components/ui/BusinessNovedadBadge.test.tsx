import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BusinessNovedadBadge } from '../../../components/ui/BusinessNovedadBadge'

describe('BusinessNovedadBadge', () => {
	it('renders nothing when novedadStatus is null', () => {
		const { container } = render(<BusinessNovedadBadge novedadStatus={null} />)
		expect(container).toBeEmptyDOMElement()
	})

	it('renders "Nueva" in blue when NUEVA', () => {
		render(<BusinessNovedadBadge novedadStatus="NUEVA" />)
		const badge = screen.getByText('Nueva')
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass('bg-blue-100')
		expect(badge).toHaveClass('text-blue-800')
	})

	it('renders "Sometida a Devolución" in amber when SOMETIDA_DEVOLUCION', () => {
		render(<BusinessNovedadBadge novedadStatus="SOMETIDA_DEVOLUCION" />)
		const badge = screen.getByText('Sometida a Devolución')
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass('bg-amber-100')
		expect(badge).toHaveClass('text-amber-800')
	})

	it('renders "Pendiente" in orange when PENDIENTE', () => {
		render(<BusinessNovedadBadge novedadStatus="PENDIENTE" />)
		const badge = screen.getByText('Pendiente')
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass('bg-orange-100')
		expect(badge).toHaveClass('text-orange-800')
	})

	it('renders "Declinada" in red when DECLINADA', () => {
		render(<BusinessNovedadBadge novedadStatus="DECLINADA" />)
		const badge = screen.getByText('Declinada')
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass('bg-red-100')
		expect(badge).toHaveClass('text-red-800')
	})

	it('renders "Cancelada" in slate when CANCELADA', () => {
		render(<BusinessNovedadBadge novedadStatus="CANCELADA" />)
		const badge = screen.getByText('Cancelada')
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass('bg-slate-100')
		expect(badge).toHaveClass('text-slate-800')
	})

	it('renders "Novedad Nueva" when variant is "detailed" and NUEVA', () => {
		render(<BusinessNovedadBadge novedadStatus="NUEVA" variant="detailed" />)
		expect(screen.getByText('Novedad Nueva')).toBeInTheDocument()
	})

	it('renders a neutral fallback chip for an unrecognized status string (D9)', () => {
		// @ts-expect-error — intentionally invalid to exercise the defensive fallback
		render(<BusinessNovedadBadge novedadStatus="UNKNOWN_LEGACY_VALUE" />)
		const badge = screen.getByText('UNKNOWN_LEGACY_VALUE')
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass('bg-slate-100')
	})

	it('falls back to a neutral chip instead of crashing on an unrecognized novedadStatus', () => {
		// Guards against shared-database drift: a value written by another
		// branch's wider status vocabulary must never crash this component.
		render(
			<BusinessNovedadBadge
				novedadStatus={'NUEVA' as unknown as 'PENDIENTE'}
			/>
		)
		const badge = screen.getByText('NUEVA')
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass('bg-slate-100')
	})
})
