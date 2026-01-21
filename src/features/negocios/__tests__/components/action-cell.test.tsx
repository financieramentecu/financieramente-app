import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ActionCell } from '../../components/BusinessTable/ActionCell'
import { UserRole } from '@/lib/auth/roles'
import { BUSINESS_STATUS } from '../../types/business-entity.types'

describe('ActionCell', () => {
	const defaultProps = {
		businessId: 1,
		businessStatus: BUSINESS_STATUS.VENTA_EFECTUADA,
		userRole: UserRole.ADMIN,
		onEdit: vi.fn(),
		onView: vi.fn(),
		onCancel: vi.fn(),
	}

	describe('Visibilidad de botones', () => {
		it('should show edit button for VENTA_EFECTUADA status', () => {
			render(<ActionCell {...defaultProps} />)

			expect(
				screen.getByRole('button', { name: /Editar/i })
			).toBeInTheDocument()
		})

		it('should NOT show edit button for EMITIDO status', () => {
			render(
				<ActionCell
					{...defaultProps}
					businessStatus={BUSINESS_STATUS.EMITIDO}
				/>
			)

			expect(
				screen.queryByRole('button', { name: /Editar/i })
			).not.toBeInTheDocument()
		})

		it('should NOT show edit button for CANCELADO status', () => {
			render(
				<ActionCell
					{...defaultProps}
					businessStatus={BUSINESS_STATUS.CANCELADO}
				/>
			)

			expect(
				screen.queryByRole('button', { name: /Editar/i })
			).not.toBeInTheDocument()
		})

		it('should always show view button', () => {
			render(<ActionCell {...defaultProps} />)

			expect(screen.getByRole('button', { name: /Ver/i })).toBeInTheDocument()
		})

		it('should show cancel button for ADMIN role', () => {
			render(<ActionCell {...defaultProps} userRole={UserRole.ADMIN} />)

			expect(
				screen.getByRole('button', { name: /Cancelar/i })
			).toBeInTheDocument()
		})

		it('should show cancel button for ANALISTA_SOPORTE role', () => {
			render(
				<ActionCell {...defaultProps} userRole={UserRole.ANALISTA_SOPORTE} />
			)

			expect(
				screen.getByRole('button', { name: /Cancelar/i })
			).toBeInTheDocument()
		})

		it('should show cancel button for ASISTENTE_GERENCIA_OPERATIVA role', () => {
			render(
				<ActionCell
					{...defaultProps}
					userRole={UserRole.ASISTENTE_GERENCIA_OPERATIVA}
				/>
			)

			expect(
				screen.getByRole('button', { name: /Cancelar/i })
			).toBeInTheDocument()
		})

		it('should NOT show cancel button for AGENTE role', () => {
			render(<ActionCell {...defaultProps} userRole={UserRole.AGENTE} />)

			expect(
				screen.queryByRole('button', { name: /Cancelar/i })
			).not.toBeInTheDocument()
		})

		it('should NOT show cancel button for CANCELADO status', () => {
			render(
				<ActionCell
					{...defaultProps}
					businessStatus={BUSINESS_STATUS.CANCELADO}
				/>
			)

			expect(
				screen.queryByRole('button', { name: /Cancelar/i })
			).not.toBeInTheDocument()
		})
	})

	describe('Eventos de click', () => {
		it('should call onEdit when edit button is clicked', () => {
			const onEdit = vi.fn()
			render(<ActionCell {...defaultProps} onEdit={onEdit} />)

			fireEvent.click(screen.getByRole('button', { name: /Editar/i }))

			expect(onEdit).toHaveBeenCalledWith(1)
		})

		it('should call onView when view button is clicked', () => {
			const onView = vi.fn()
			render(<ActionCell {...defaultProps} onView={onView} />)

			fireEvent.click(screen.getByRole('button', { name: /Ver/i }))

			expect(onView).toHaveBeenCalledWith(1)
		})

		it('should call onCancel when cancel button is clicked', () => {
			const onCancel = vi.fn()
			render(<ActionCell {...defaultProps} onCancel={onCancel} />)

			fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }))

			expect(onCancel).toHaveBeenCalledWith(1)
		})
	})

	describe('Escenario 10: Visualización del ícono de cancelar según rol', () => {
		it('should show edit, view, cancel for ASISTENTE_GERENCIA in VENTA_EFECTUADA', () => {
			render(
				<ActionCell
					{...defaultProps}
					userRole={UserRole.ASISTENTE_GERENCIA_OPERATIVA}
					businessStatus={BUSINESS_STATUS.VENTA_EFECTUADA}
				/>
			)

			expect(
				screen.getByRole('button', { name: /Editar/i })
			).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /Ver/i })).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /Cancelar/i })
			).toBeInTheDocument()
		})

		it('should show view, cancel for ASISTENTE_GERENCIA in EMITIDO', () => {
			render(
				<ActionCell
					{...defaultProps}
					userRole={UserRole.ASISTENTE_GERENCIA_OPERATIVA}
					businessStatus={BUSINESS_STATUS.EMITIDO}
				/>
			)

			expect(
				screen.queryByRole('button', { name: /Editar/i })
			).not.toBeInTheDocument()
			expect(screen.getByRole('button', { name: /Ver/i })).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /Cancelar/i })
			).toBeInTheDocument()
		})

		it('should show only view for CANCELADO status', () => {
			render(
				<ActionCell
					{...defaultProps}
					userRole={UserRole.ASISTENTE_GERENCIA_OPERATIVA}
					businessStatus={BUSINESS_STATUS.CANCELADO}
				/>
			)

			expect(
				screen.queryByRole('button', { name: /Editar/i })
			).not.toBeInTheDocument()
			expect(screen.getByRole('button', { name: /Ver/i })).toBeInTheDocument()
			expect(
				screen.queryByRole('button', { name: /Cancelar/i })
			).not.toBeInTheDocument()
		})
	})
})
