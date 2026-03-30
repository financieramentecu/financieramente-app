import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModalErroresConfiguracion } from '../../components/ModalErroresConfiguracion'
import type { RegistroConError } from '../../types/types'

const errores: RegistroConError[] = [
	{
		idSettlementCommission: 100,
		categoryCode: 'AGENCIA',
		errorCode: 'FIXED_MISSING_USER',
		contrato: 'CONT-1001',
		idBusiness: 1,
		idUserAgent: 10,
	},
	{
		idSettlementCommission: 101,
		categoryCode: 'LIDER',
		errorCode: 'UPLINE_NO_MATCH',
		contrato: 'CONT-1002',
		idBusiness: 2,
		idUserAgent: 11,
	},
	{
		idSettlementCommission: 102,
		categoryCode: 'COACH',
		errorCode: 'FIXED_USER_INACTIVE',
		contrato: null,
		idBusiness: 3,
		idUserAgent: 12,
	},
]

describe('ModalErroresConfiguracion', () => {
	const onClose = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders the list of errors when open=true and registrosConError is non-empty', () => {
		render(
			<ModalErroresConfiguracion
				registrosConError={errores}
				open={true}
				onClose={onClose}
			/>
		)

		expect(screen.getByText('100')).toBeInTheDocument()
		expect(screen.getByText('AGENCIA')).toBeInTheDocument()
		expect(screen.getByText('Usuario fijo no configurado')).toBeInTheDocument()

		expect(screen.getByText('101')).toBeInTheDocument()
		expect(screen.getByText('LIDER')).toBeInTheDocument()
		expect(screen.getByText('Sin coincidencia en cadena de ventas')).toBeInTheDocument()

		expect(screen.getByText('102')).toBeInTheDocument()
		expect(screen.getByText('COACH')).toBeInTheDocument()
		expect(screen.getByText('Usuario fijo inactivo')).toBeInTheDocument()
	})

	it('calls onClose when the close button is clicked', async () => {
		const user = userEvent.setup()

		render(
			<ModalErroresConfiguracion
				registrosConError={errores}
				open={true}
				onClose={onClose}
			/>
		)

		const closeButton = screen.getByRole('button', { name: /cerrar/i })
		await user.click(closeButton)

		expect(onClose).toHaveBeenCalledTimes(1)
	})

	it('does not render content when registrosConError is empty', () => {
		const { container } = render(
			<ModalErroresConfiguracion
				registrosConError={[]}
				open={true}
				onClose={onClose}
			/>
		)

		expect(container.firstChild).toBeNull()
	})

	it('does not render content when open=false (Dialog closed)', () => {
		render(
			<ModalErroresConfiguracion
				registrosConError={errores}
				open={false}
				onClose={onClose}
			/>
		)

		expect(screen.queryByText('Usuario fijo no configurado')).not.toBeInTheDocument()
	})
})
