import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BusinessStatusBadge } from '../../../components/ui/BusinessStatusBadge'

describe('BusinessStatusBadge', () => {
	describe('LIQUIDADO status', () => {
		it('renders the label "Liquidado" for LIQUIDADO status', () => {
			render(<BusinessStatusBadge status="LIQUIDADO" />)
			expect(screen.getByText('Liquidado')).toBeInTheDocument()
		})

		it('applies green color classes for LIQUIDADO badge', () => {
			render(<BusinessStatusBadge status="LIQUIDADO" />)
			const badge = screen.getByText('Liquidado')
			expect(badge).toHaveClass('bg-green-100')
			expect(badge).toHaveClass('text-green-800')
		})
	})

	// ── 4.7: FONDEADO status ──────────────────────────────────────────────────
	describe('FONDEADO status', () => {
		it('renders the label "Fondeado" for FONDEADO status', () => {
			render(<BusinessStatusBadge status="FONDEADO" />)
			expect(screen.getByText('Fondeado')).toBeInTheDocument()
		})

		it('applies indigo color classes for FONDEADO badge', () => {
			render(<BusinessStatusBadge status="FONDEADO" />)
			const badge = screen.getByText('Fondeado')
			expect(badge).toHaveClass('bg-indigo-100')
			expect(badge).toHaveClass('text-indigo-800')
		})
	})

	describe('existing statuses remain unaffected', () => {
		it('renders "Venta Efectuada" for VENTA_EFECTUADA', () => {
			render(<BusinessStatusBadge status="VENTA_EFECTUADA" />)
			expect(screen.getByText('Venta Efectuada')).toBeInTheDocument()
		})

		it('renders "Emitido" for EMITIDO', () => {
			render(<BusinessStatusBadge status="EMITIDO" />)
			expect(screen.getByText('Emitido')).toBeInTheDocument()
		})

		it('renders "Cancelado" for CANCELADO', () => {
			render(<BusinessStatusBadge status="CANCELADO" />)
			expect(screen.getByText('Cancelado')).toBeInTheDocument()
		})
	})

	describe('legacy and unknown statuses', () => {
		it('shows legacy COMISIONANDO as fallback text when received at runtime', () => {
			render(<BusinessStatusBadge status={'COMISIONANDO' as never} />)

			expect(screen.getByText('COMISIONANDO')).toBeInTheDocument()
		})
	})
})
