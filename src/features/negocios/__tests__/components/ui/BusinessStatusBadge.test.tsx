import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BusinessStatusBadge } from '../../../components/ui/BusinessStatusBadge'

describe('BusinessStatusBadge', () => {
	describe('COMISIONANDO status', () => {
		it('renders the label "Comisionando" for COMISIONANDO status', () => {
			render(<BusinessStatusBadge status="COMISIONANDO" />)
			expect(screen.getByText('Comisionando')).toBeInTheDocument()
		})

		it('applies blue color classes for COMISIONANDO badge', () => {
			render(<BusinessStatusBadge status="COMISIONANDO" />)
			const badge = screen.getByText('Comisionando')
			expect(badge).toHaveClass('bg-blue-100')
			expect(badge).toHaveClass('text-blue-800')
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
})
