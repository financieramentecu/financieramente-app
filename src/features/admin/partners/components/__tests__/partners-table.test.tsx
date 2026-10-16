import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PartnersTable } from '../partners-table'
import type { PartnerDto } from '../../types/partner.types'

function partner(overrides: Partial<PartnerDto>): PartnerDto {
	return {
		id: 1,
		name: 'Ana',
		lastName: 'Gómez',
		typeIdentity: 'CC',
		identityNumber: '1',
		email: 'ana@p.com',
		phone: null,
		active: true,
		activatedAt: null,
		// 02:00Z on 11 Oct is still 10 Oct in Bogotá (UTC-5).
		createdAt: '2026-10-11T02:00:00.000Z',
		status: 'PENDING',
		leader: {
			id: 9,
			name: 'Luis',
			lastName: 'Pérez',
			email: 'l@c.com',
			levelCode: 'LEVEL_2',
		},
		...overrides,
	}
}

const PENDING = partner({ id: 1, name: 'Pendiente', email: 'pend@p.com' })
const ACTIVE = partner({
	id: 2,
	name: 'Activa',
	email: 'act@p.com',
	activatedAt: '2026-10-01T00:00:00.000Z',
	status: 'ACTIVE',
})
const OFF = partner({
	id: 3,
	name: 'Inactiva',
	email: 'off@p.com',
	active: false,
	status: 'DEACTIVATED',
})

function rowOf(email: string) {
	return screen.getByText(email).closest('tr') as HTMLElement
}

function renderTable(
	extra: Partial<React.ComponentProps<typeof PartnersTable>> = {}
) {
	const onAction = vi.fn()
	const onEdit = vi.fn()
	render(
		<PartnersTable
			partners={[PENDING, ACTIVE, OFF]}
			isLoading={false}
			pending={null}
			onAction={onAction}
			onEdit={onEdit}
			{...extra}
		/>
	)
	return { onAction, onEdit }
}

describe('PartnersTable', () => {
	it('shows the Spanish status badge for each lifecycle state', () => {
		renderTable()
		expect(
			within(rowOf('pend@p.com')).getByText('Pendiente')
		).toBeInTheDocument()
		expect(within(rowOf('act@p.com')).getByText('Activo')).toBeInTheDocument()
		expect(
			within(rowOf('off@p.com')).getByText('Desactivado')
		).toBeInTheDocument()
	})

	it('shows leader, email and the Bogotá creation date', () => {
		renderTable()
		const row = rowOf('pend@p.com')
		expect(within(row).getByText(/Luis Pérez/)).toBeInTheDocument()
		// formatDateBogota -> 10/10/2026 (not 11/10): the UTC date would be wrong.
		expect(row.textContent).toContain('10/10/2026')
		expect(row.textContent).not.toContain('11/10/2026')
	})

	it('offers resend + deactivate to a pending partner, no reactivate', () => {
		renderTable()
		const row = rowOf('pend@p.com')
		expect(
			within(row).getByRole('button', { name: /reenviar activación/i })
		).toBeInTheDocument()
		expect(
			within(row).getByRole('button', { name: /^desactivar/i })
		).toBeInTheDocument()
		expect(within(row).queryByRole('button', { name: /reactivar/i })).toBeNull()
	})

	it('offers only deactivate to an activated partner', () => {
		renderTable()
		const row = rowOf('act@p.com')
		expect(
			within(row).getByRole('button', { name: /^desactivar/i })
		).toBeInTheDocument()
		expect(within(row).queryByRole('button', { name: /reenviar/i })).toBeNull()
		expect(within(row).queryByRole('button', { name: /reactivar/i })).toBeNull()
	})

	it('offers only reactivate to a deactivated partner', () => {
		renderTable()
		const row = rowOf('off@p.com')
		expect(
			within(row).getByRole('button', { name: /reactivar/i })
		).toBeInTheDocument()
		expect(
			within(row).queryByRole('button', { name: /^desactivar/i })
		).toBeNull()
		expect(within(row).queryByRole('button', { name: /reenviar/i })).toBeNull()
	})

	it('reports the clicked action with the partner', async () => {
		const { onAction } = renderTable()
		await userEvent.click(
			within(rowOf('pend@p.com')).getByRole('button', {
				name: /reenviar activación/i,
			})
		)
		expect(onAction).toHaveBeenCalledWith('resend', PENDING)
		await userEvent.click(
			within(rowOf('off@p.com')).getByRole('button', { name: /reactivar/i })
		)
		expect(onAction).toHaveBeenCalledWith('reactivate', OFF)
	})

	it('disables the buttons of the row with an action in flight', () => {
		renderTable({ pending: { id: 1, action: 'resend' } })
		for (const button of within(rowOf('pend@p.com')).getAllByRole('button')) {
			expect(button).toBeDisabled()
		}
		expect(
			within(rowOf('act@p.com')).getByRole('button', { name: /^desactivar/i })
		).toBeEnabled()
	})

	it('shows "Ver como" for non-deactivated partners only, when enabled', async () => {
		const onImpersonate = vi.fn()
		renderTable({ onImpersonate })
		expect(
			within(rowOf('pend@p.com')).getByRole('button', { name: /ver como/i })
		).toBeInTheDocument()
		expect(
			within(rowOf('act@p.com')).getByRole('button', { name: /ver como/i })
		).toBeInTheDocument()
		expect(
			within(rowOf('off@p.com')).queryByRole('button', { name: /ver como/i })
		).toBeNull()
		await userEvent.click(
			within(rowOf('pend@p.com')).getByRole('button', { name: /ver como/i })
		)
		expect(onImpersonate).toHaveBeenCalledWith(PENDING)
	})

	it('hides "Ver como" when impersonation is not enabled', () => {
		renderTable()
		expect(screen.queryByRole('button', { name: /ver como/i })).toBeNull()
	})

	it('offers "Editar" on every partner state and reports the partner', async () => {
		const { onEdit } = renderTable()
		for (const email of ['pend@p.com', 'act@p.com', 'off@p.com']) {
			expect(
				within(rowOf(email)).getByRole('button', { name: /editar/i })
			).toBeInTheDocument()
		}
		await userEvent.click(
			within(rowOf('off@p.com')).getByRole('button', { name: /editar/i })
		)
		expect(onEdit).toHaveBeenCalledWith(OFF)
	})

	it('disables "Editar" only on the row with an action in flight', () => {
		renderTable({ pending: { id: 2, action: 'deactivate' } })
		expect(
			within(rowOf('act@p.com')).getByRole('button', { name: /editar/i })
		).toBeDisabled()
		expect(
			within(rowOf('pend@p.com')).getByRole('button', { name: /editar/i })
		).toBeEnabled()
	})
})
