import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BusinessNovedadBadge } from '../../../components/ui/BusinessNovedadBadge'

describe('BusinessNovedadBadge', () => {
	it('renders nothing when novedadStatus is null', () => {
		const { container } = render(<BusinessNovedadBadge novedadStatus={null} />)
		expect(container).toBeEmptyDOMElement()
	})

	it('renders "Pendiente" in orange when PENDIENTE', () => {
		render(<BusinessNovedadBadge novedadStatus="PENDIENTE" />)
		const badge = screen.getByText('Pendiente')
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass('bg-orange-100')
		expect(badge).toHaveClass('text-orange-800')
	})

	it('renders "Resuelta" in green/neutral when RESUELTA', () => {
		render(<BusinessNovedadBadge novedadStatus="RESUELTA" />)
		const badge = screen.getByText('Resuelta')
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass('bg-emerald-100')
		expect(badge).toHaveClass('text-emerald-800')
	})

	it('renders "Novedad Pendiente" when variant is "detailed" and PENDIENTE', () => {
		render(<BusinessNovedadBadge novedadStatus="PENDIENTE" variant="detailed" />)
		expect(screen.getByText('Novedad Pendiente')).toBeInTheDocument()
	})

	it('renders "Novedad Resuelta" when variant is "detailed" and RESUELTA', () => {
		render(<BusinessNovedadBadge novedadStatus="RESUELTA" variant="detailed" />)
		expect(screen.getByText('Novedad Resuelta')).toBeInTheDocument()
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
