import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AnnualFundingModal } from '../AnnualFundingModal'

const pendingInstallment = {
	installmentIndex: 1,
	status: 'SIN_FONDEAR' as const,
	dateAnchored: null,
}

describe('AnnualFundingModal', () => {
	const defaults = {
		open: true,
		onOpenChange: vi.fn(),
		businessId: 42,
		installments: [pendingInstallment],
		onConfirm: vi.fn(),
	}

	it('title includes contract when contractLabel is set', () => {
		render(
			<AnnualFundingModal {...defaults} contractLabel="PN-999" />
		)

		expect(
			screen.getByRole('heading', {
				name: /Fondear anualidades · Contrato PN-999/i,
			})
		).toBeInTheDocument()
	})

	it('title falls back to Negocio #id when contract is empty', () => {
		render(
			<AnnualFundingModal
				{...defaults}
				contractLabel=""
				businessId={99}
			/>
		)

		expect(
			screen.getByRole('heading', {
				name: /Fondear anualidades · Negocio #99/i,
			})
		).toBeInTheDocument()
	})
})
