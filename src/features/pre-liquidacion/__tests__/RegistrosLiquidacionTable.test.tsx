import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegistrosLiquidacionTable } from '../components/RegistrosLiquidacionTable'
import type { RegistroLiquidacionDetalle } from '../types/types'

function makeRegistro(
	id: number,
	overrides: Partial<RegistroLiquidacionDetalle> = {}
): RegistroLiquidacionDetalle {
	return {
		idSettlementCommission: id,
		idBusiness: 100 + id,
		contrato: `CT-00${id}`,
		nombreAsesor: `Asesor ${id}`,
		tipo: 'BASE',
		monto: 1000 * id,
		baseComision: 1000 * id,
		porcentajeDescuento: 0.1,
		porcentajeClawback: 0,
		esClawback: false,
		esRezagado: false,
		fechaSincronizacion: '2026-01-10T00:00:00.000Z',
		fechaRezagado: null,
		fechaInicio: null,
		fechaFin: null,
		status: 'SYNCHRONIZED',
		nombreCliente: `Cliente ${id}`,
		...overrides,
	}
}

function makeDefaultProps(overrides = {}) {
	return {
		registros: [],
		fileType: 'POLIZA',
		selectedIds: new Set<number>(),
		onSelectionChange: vi.fn(),
		onVerNegocio: vi.fn(),
		onVerDistribucion: vi.fn(),
		...overrides,
	}
}

describe('RegistrosLiquidacionTable — "Detalle de Distribución" button', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders a "Detalle de Distribución" button for each row', () => {
		const registros = [makeRegistro(1), makeRegistro(2), makeRegistro(3)]
		const props = makeDefaultProps({ registros })

		render(<RegistrosLiquidacionTable {...props} />)

		const buttons = screen.getAllByRole('button', { name: /Distribución/i })
		expect(buttons).toHaveLength(3)
	})

	it('calls onVerDistribucion with the correct idSettlementCommission on click', () => {
		const onVerDistribucion = vi.fn()
		const registros = [makeRegistro(5), makeRegistro(7)]
		const props = makeDefaultProps({ registros, onVerDistribucion })

		render(<RegistrosLiquidacionTable {...props} />)

		const buttons = screen.getAllByRole('button', {
			name: /Distribución/i,
		})

		fireEvent.click(buttons[0])
		expect(onVerDistribucion).toHaveBeenCalledWith(5)

		fireEvent.click(buttons[1])
		expect(onVerDistribucion).toHaveBeenCalledWith(7)
	})

	it('calls onVerDistribucion only once per click', () => {
		const onVerDistribucion = vi.fn()
		const registros = [makeRegistro(10)]
		const props = makeDefaultProps({ registros, onVerDistribucion })

		render(<RegistrosLiquidacionTable {...props} />)

		const button = screen.getByRole('button', { name: /Distribución/i })
		fireEvent.click(button)

		expect(onVerDistribucion).toHaveBeenCalledTimes(1)
		expect(onVerDistribucion).toHaveBeenCalledWith(10)
	})

	it('renders no "Detalle de Distribución" buttons when registros is empty', () => {
		const props = makeDefaultProps({ registros: [] })

		render(<RegistrosLiquidacionTable {...props} />)

		const buttons = screen.queryAllByRole('button', {
			name: /Distribución/i,
		})
		expect(buttons).toHaveLength(0)
	})

	it('renders the "Detalle de Distribución" button text visible in each row', () => {
		const registros = [makeRegistro(1)]
		const props = makeDefaultProps({ registros })

		render(<RegistrosLiquidacionTable {...props} />)

		expect(screen.getByText('Distribución')).toBeInTheDocument()
	})
})

describe('RegistrosLiquidacionTable — selection and other behaviours', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders all registro rows', () => {
		const registros = [makeRegistro(1), makeRegistro(2)]
		const props = makeDefaultProps({ registros })

		render(<RegistrosLiquidacionTable {...props} />)

		expect(screen.getByText('CT-001')).toBeInTheDocument()
		expect(screen.getByText('CT-002')).toBeInTheDocument()
	})

	it('calls onSelectionChange with the correct id when toggling a row checkbox', () => {
		const onSelectionChange = vi.fn()
		const registros = [makeRegistro(3)]
		const props = makeDefaultProps({ registros, onSelectionChange })

		render(<RegistrosLiquidacionTable {...props} />)

		const checkbox = screen.getByLabelText('Seleccionar registro 3')
		fireEvent.click(checkbox)

		expect(onSelectionChange).toHaveBeenCalledWith(new Set([3]))
	})

	it('renders "Ver negocio" button only when idBusiness is not null', () => {
		const registros = [
			makeRegistro(1, { idBusiness: 101 }),
			makeRegistro(2, { idBusiness: null }),
		]
		const props = makeDefaultProps({ registros })

		render(<RegistrosLiquidacionTable {...props} />)

		const verNegocioButtons = screen.queryAllByRole('button', {
			name: /Negocio/i,
		})
		expect(verNegocioButtons).toHaveLength(1)
	})

	it('calls onVerNegocio with the correct idBusiness on click', () => {
		const onVerNegocio = vi.fn()
		const registros = [makeRegistro(1, { idBusiness: 42 })]
		const props = makeDefaultProps({ registros, onVerNegocio })

		render(<RegistrosLiquidacionTable {...props} />)

		const button = screen.getByRole('button', { name: /Negocio/i })
		fireEvent.click(button)

		expect(onVerNegocio).toHaveBeenCalledWith(42)
	})
})
