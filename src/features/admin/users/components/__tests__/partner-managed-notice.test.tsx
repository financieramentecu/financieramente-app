import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PartnerManagedNotice } from '../partner-managed-notice'

describe('PartnerManagedNotice', () => {
	it('tells the admin that partners are managed in the Partners module', () => {
		render(<PartnerManagedNotice />)
		expect(screen.getByRole('alert')).toHaveTextContent('módulo Partners')
	})

	it('links to the Partners module', () => {
		render(<PartnerManagedNotice />)
		expect(
			screen.getByRole('link', { name: /ir a partners/i })
		).toHaveAttribute('href', '/dashboard/admin/partners')
	})
})
