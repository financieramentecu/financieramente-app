import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { BusinessViewModal } from '../../components/modals/BusinessViewModal'
import { createMockBusiness } from '../fixtures/mock-business'
import { formatDateBogota } from '@/features/shared/lib/format-date'

vi.mock('sonner', () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}))

let globalOnOpenChange: ((open: boolean) => void) | undefined

vi.mock('@/features/shared/ui/alert-dialog', () => ({
	AlertDialog: ({
		children,
		open,
		onOpenChange,
	}: {
		children: React.ReactNode
		open: boolean
		onOpenChange?: (open: boolean) => void
	}) => {
		globalOnOpenChange = onOpenChange
		return open ? <div data-testid="mock-alert-dialog">{children}</div> : null
	},
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
		<button
			data-testid="mock-cancel-alert-btn"
			onClick={() => {
				if (globalOnOpenChange) {
					globalOnOpenChange(false)
				}
			}}
		>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		onClick,
	}: {
		children: React.ReactNode
		onClick?: (e: React.MouseEvent) => void
	}) => (
		<button
			data-testid="mock-confirm-alert-btn"
			onClick={(e) => {
				if (onClick) onClick(e)
			}}
		>
			{children}
		</button>
	),
}))

describe('BusinessViewModal - Edición de Fecha de Emisión', () => {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		business: createMockBusiness({
			id: 1,
			status: 'EMITIDO',
			dateIssued: '2026-05-01T12:00:00.000Z',
		}),
		allowEditDateIssued: true,
		onSaveDateIssued: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
		globalOnOpenChange = undefined
	})

	describe('Permisos y Estados del Negocio', () => {
		it('debería mostrar el campo Fecha de Emisión en modo solo lectura y NO debería renderizar el botón de editar si el negocio NO está en estado EMITIDO', () => {
			const businessNoEmitido = createMockBusiness({
				id: 2,
				status: 'VENTA_EFECTUADA',
				dateIssued: '2026-05-01T12:00:00.000Z',
			})

			render(<BusinessViewModal {...defaultProps} business={businessNoEmitido} />)

			// El valor de la fecha se muestra formateado en local de Colombia es-CO
			const expectedFormattedDate = formatDateBogota('2026-05-01T12:00:00.000Z')
			expect(screen.getByText(expectedFormattedDate)).toBeInTheDocument()

			// El botón "Editar fecha de emisión" no debe estar visible en el documento
			expect(screen.queryByRole('button', { name: /Editar fecha de emisión/i })).not.toBeInTheDocument()

			// No debe renderizarse como un input de fecha
			expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
		})

		it('no debería renderizar el botón "Editar fecha de emisión" si el usuario NO tiene permisos (allowEditDateIssued es false)', () => {
			render(<BusinessViewModal {...defaultProps} allowEditDateIssued={false} />)

			// El botón no debe estar visible en el documento
			expect(screen.queryByRole('button', { name: /Editar fecha de emisión/i })).not.toBeInTheDocument()

			// La fecha se sigue visualizando
			const expectedFormattedDate = formatDateBogota('2026-05-01T12:00:00.000Z')
			expect(screen.getByText(expectedFormattedDate)).toBeInTheDocument()
		})

		it('debería renderizar el botón "Editar fecha de emisión" habilitado si el usuario tiene permisos y el negocio está en estado EMITIDO', () => {
			render(<BusinessViewModal {...defaultProps} />)

			const editBtn = screen.getByRole('button', { name: /Editar fecha de emisión/i })
			expect(editBtn).toBeInTheDocument()
			expect(editBtn).not.toBeDisabled()
		})
	})

	describe('Flujo de Edición', () => {
		it('debería cambiar a modo edición al hacer clic en "Editar fecha de emisión"', async () => {
			render(<BusinessViewModal {...defaultProps} />)

			const editBtn = screen.getByRole('button', { name: /Editar fecha de emisión/i })
			fireEvent.click(editBtn)

			// Debería aparecer el input tipo date con la fecha actual del negocio pre-cargada
			const dateInput = screen.getByDisplayValue('2026-05-01') as HTMLInputElement
			expect(dateInput).toBeInTheDocument()
			expect(dateInput.type).toBe('date')

			// En el footer se deben mostrar los botones "Guardar" y "Cancelar"
			expect(screen.getByRole('button', { name: /^Guardar$/i })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument()

			// El botón "Editar fecha de emisión" original ya no debe estar visible
			expect(screen.queryByRole('button', { name: /Editar fecha de emisión/i })).not.toBeInTheDocument()
		})

		it('debería salir del modo de edición y restaurar la fecha original al hacer clic en "Cancelar"', async () => {
			render(<BusinessViewModal {...defaultProps} />)

			// Entramos a edición
			fireEvent.click(screen.getByRole('button', { name: /Editar fecha de emisión/i }))

			// Cambiamos el valor del input
			const dateInput = screen.getByDisplayValue('2026-05-01')
			fireEvent.change(dateInput, { target: { value: '2026-05-15' } })
			expect(screen.getByDisplayValue('2026-05-15')).toBeInTheDocument()

			// Cancelamos la edición
			fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }))

			// Vuelve al modo lectura
			const expectedFormattedDate = formatDateBogota('2026-05-01T12:00:00.000Z')
			expect(screen.getByText(expectedFormattedDate)).toBeInTheDocument()

			// El botón "Editar fecha de emisión" está visible de nuevo
			expect(screen.getByRole('button', { name: /Editar fecha de emisión/i })).toBeInTheDocument()
			expect(screen.queryByRole('button', { name: /^Guardar$/i })).not.toBeInTheDocument()
		})

		it('debería deshabilitar el botón "Guardar" si la fecha no ha cambiado o es vacía', () => {
			render(<BusinessViewModal {...defaultProps} />)

			fireEvent.click(screen.getByRole('button', { name: /Editar fecha de emisión/i }))

			const guardarBtn = screen.getByRole('button', { name: /^Guardar$/i })
			// Al entrar a editar la fecha sigue siendo la misma inicial ('2026-05-01'), así que debería estar deshabilitado
			expect(guardarBtn).toBeDisabled()

			// Si la fecha es vacía, también debe estar deshabilitado
			const dateInput = screen.getByDisplayValue('2026-05-01')
			fireEvent.change(dateInput, { target: { value: '' } })
			expect(guardarBtn).toBeDisabled()
		})
	})

	describe('Confirmación y Guardado', () => {
		it('debería abrir el diálogo de confirmación con el mensaje exacto al guardar un cambio de fecha', async () => {
			render(<BusinessViewModal {...defaultProps} />)

			// Entrar a edición
			fireEvent.click(screen.getByRole('button', { name: /Editar fecha de emisión/i }))

			// Cambiar la fecha a una nueva
			const dateInput = screen.getByDisplayValue('2026-05-01')
			fireEvent.change(dateInput, { target: { value: '2026-05-15' } })

			// Hacer clic en Guardar
			const guardarBtn = screen.getByRole('button', { name: /^Guardar$/i })
			expect(guardarBtn).not.toBeDisabled()
			fireEvent.click(guardarBtn)

			// Debería mostrar el diálogo de confirmación mockeado
			const dialog = screen.getByTestId('mock-alert-dialog')
			expect(dialog).toBeInTheDocument()

			// Validar el mensaje de confirmación exacto
			// Fecha anterior: '2026-05-01T12:00:00.000Z' -> Formato es-CO local
			// Fecha nueva: '2026-05-15T00:00:00' -> Formato es-CO local
			const expectedOldDateStr = formatDateBogota('2026-05-01T12:00:00.000Z')
			const expectedNewDateStr = formatDateBogota('2026-05-15')

			expect(dialog.textContent).toContain('Confirmación requerida antes de aplicar el cambio')
			expect(dialog.textContent).toContain('Está a punto de cambiar la fecha de emisión de')
			expect(dialog.textContent).toContain(expectedOldDateStr)
			expect(dialog.textContent).toContain(expectedNewDateStr)
			expect(dialog.textContent).toContain('Esta acción recalculará las fechas esperadas de Fondeo ¿Desea continuar?')
		})

		it('no debería ejecutar ningún cambio si el usuario selecciona "Cancelar" en el diálogo de confirmación', async () => {
			render(<BusinessViewModal {...defaultProps} />)

			fireEvent.click(screen.getByRole('button', { name: /Editar fecha de emisión/i }))

			const dateInput = screen.getByDisplayValue('2026-05-01')
			fireEvent.change(dateInput, { target: { value: '2026-05-15' } })

			fireEvent.click(screen.getByRole('button', { name: /^Guardar$/i }))

			// Cancelar en la alerta
			const cancelAlertBtn = screen.getByTestId('mock-cancel-alert-btn')
			fireEvent.click(cancelAlertBtn)

			// El modal de alerta debe cerrarse
			expect(screen.queryByTestId('mock-alert-dialog')).not.toBeInTheDocument()

			// La prop onSaveDateIssued no debe haber sido llamada
			expect(defaultProps.onSaveDateIssued).not.toHaveBeenCalled()

			// Seguimos en modo de edición en el modal principal
			expect(screen.getByDisplayValue('2026-05-15')).toBeInTheDocument()
		})

		it('debería ejecutar el cambio, invocar a onSaveDateIssued con formato ISO local T00:00:00 y cerrar la edición al dar clic en "Confirmar"', async () => {
			const onSaveDateIssuedMock = vi.fn().mockResolvedValue(undefined)
			render(
				<BusinessViewModal
					{...defaultProps}
					onSaveDateIssued={onSaveDateIssuedMock}
				/>
			)

			fireEvent.click(screen.getByRole('button', { name: /Editar fecha de emisión/i }))

			const dateInput = screen.getByDisplayValue('2026-05-01')
			fireEvent.change(dateInput, { target: { value: '2026-05-15' } })

			fireEvent.click(screen.getByRole('button', { name: /^Guardar$/i }))

			const confirmAlertBtn = screen.getByTestId('mock-confirm-alert-btn')
			await userEvent.click(confirmAlertBtn)

			// Debería invocar a la prop de guardado con el ID de negocio y el string ISO de la fecha local
			// '2026-05-15T00:00:00' -> convertido a ISO
			const expectedIsoString = '2026-05-15T12:00:00.000Z'
			expect(onSaveDateIssuedMock).toHaveBeenCalledWith(1, expectedIsoString)

			// Debería cerrar el modo de edición y volver a la vista normal
			await waitFor(() => {
				expect(screen.queryByRole('button', { name: /^Guardar$/i })).not.toBeInTheDocument()
			})
			expect(screen.getByRole('button', { name: /Editar fecha de emisión/i })).toBeInTheDocument()
		})

		it('debería mostrar un mensaje de error con toast si la llamada a la API en onSaveDateIssued falla', async () => {
			const errorMessage = 'Error de validación o fallo de base de datos'
			const onSaveDateIssuedMock = vi.fn().mockRejectedValue(new Error(errorMessage))

			render(
				<BusinessViewModal
					{...defaultProps}
					onSaveDateIssued={onSaveDateIssuedMock}
				/>
			)

			fireEvent.click(screen.getByRole('button', { name: /Editar fecha de emisión/i }))

			const dateInput = screen.getByDisplayValue('2026-05-01')
			fireEvent.change(dateInput, { target: { value: '2026-05-15' } })

			fireEvent.click(screen.getByRole('button', { name: /^Guardar$/i }))

			const confirmAlertBtn = screen.getByTestId('mock-confirm-alert-btn')
			await userEvent.click(confirmAlertBtn)

			// El toast de error debe ser disparado con el mensaje correspondiente
			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(errorMessage)
			})
		})
	})
})
