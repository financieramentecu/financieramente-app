import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LeadCrmFieldsSection } from '@/features/leads/custom-fields/lead-crm-fields-section'
import { fetchCustomFields, fetchLeadCrmFields, saveLeadCrmFields } from '@/features/leads/custom-fields/crm-fields-api'
import { fetchTagOptions } from '@/features/leads/table/lead-table-api'

vi.mock('@/features/leads/custom-fields/crm-fields-api', () => ({
	fetchLeadCrmFields: vi.fn(),
	fetchCustomFields: vi.fn(),
	saveLeadCrmFields: vi.fn(),
	saveLeadTags: vi.fn(),
}))
vi.mock('@/features/leads/table/lead-table-api', () => ({ fetchTagOptions: vi.fn() }))

const vip = { idLeadTag: 1, name: 'VIP', color: '#f00' }

describe('LeadCrmFieldsSection', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(fetchLeadCrmFields).mockResolvedValue({ estimatedValue: '2000000', probability: 25, customFieldValues: { product: 'Seguro' } })
		vi.mocked(fetchCustomFields).mockResolvedValue([
			{ idLeadCustomField: 4, key: 'product', label: 'Producto', type: 'SELECT', options: ['Crédito', 'Seguro'], position: 0 },
		])
		vi.mocked(fetchTagOptions).mockResolvedValue([vip])
	})

	it('shows read-only values for a read-only role', async () => {
		render(<LeadCrmFieldsSection idLead={10} initialTags={[vip]} canEdit={false} />)
		expect(await screen.findByText('Datos del CRM')).toBeInTheDocument()
		expect(screen.getByText('VIP')).toBeInTheDocument()
		expect(screen.getByText('25%')).toBeInTheDocument()
		expect(screen.getByText('Seguro')).toBeInTheDocument()
		expect(screen.getByText(/500\.000/)).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Guardar datos del CRM' })).not.toBeInTheDocument()
	})

	it('edits value, probability and a custom field', async () => {
		vi.mocked(saveLeadCrmFields).mockResolvedValue({ estimatedValue: '3000000', probability: 50, customFieldValues: { product: 'Crédito' } })
		render(<LeadCrmFieldsSection idLead={10} initialTags={[]} canEdit />)
		const value = await screen.findByLabelText('Valor estimado (COP)')
		expect(value).toHaveValue('2000000')
		fireEvent.change(value, { target: { value: '3000000' } })
		fireEvent.change(screen.getByLabelText('Probabilidad (%)'), { target: { value: '50' } })
		fireEvent.change(screen.getByLabelText('Producto'), { target: { value: 'Crédito' } })
		fireEvent.click(screen.getByRole('button', { name: 'Guardar datos del CRM' }))
		await waitFor(() =>
			expect(saveLeadCrmFields).toHaveBeenCalledWith(10, {
				estimatedValue: '3000000',
				probability: 50,
				customFields: { product: 'Crédito' },
			})
		)
		expect(await screen.findByText('Datos del CRM guardados.')).toBeInTheDocument()
		expect(screen.getByLabelText('Valor estimado (COP)')).toHaveValue('3000000')
	})

	it('shows the server validation error', async () => {
		vi.mocked(saveLeadCrmFields).mockRejectedValue(new Error('La probabilidad va de 0 a 100'))
		render(<LeadCrmFieldsSection idLead={10} initialTags={[]} canEdit />)
		fireEvent.click(await screen.findByRole('button', { name: 'Guardar datos del CRM' }))
		expect(await screen.findByRole('alert')).toHaveTextContent('La probabilidad va de 0 a 100')
	})

	it('shows a load error', async () => {
		vi.mocked(fetchLeadCrmFields).mockRejectedValue(new Error('No fue posible cargar los datos del CRM.'))
		render(<LeadCrmFieldsSection idLead={10} initialTags={[]} canEdit />)
		expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cargar los datos del CRM.')
	})
})
