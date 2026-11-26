import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CrmSettingsDialog, suggestFieldKey } from '@/features/leads/custom-fields/crm-settings-dialog'
import {
	createCustomField,
	createTag,
	deleteCustomField,
	deleteTag,
	fetchCustomFields,
} from '@/features/leads/custom-fields/crm-fields-api'
import { fetchTagOptions } from '@/features/leads/table/lead-table-api'

vi.mock('@/features/leads/custom-fields/crm-fields-api', () => ({
	fetchCustomFields: vi.fn(),
	createCustomField: vi.fn(),
	deleteCustomField: vi.fn(),
	createTag: vi.fn(),
	deleteTag: vi.fn(),
}))
vi.mock('@/features/leads/table/lead-table-api', () => ({ fetchTagOptions: vi.fn() }))

async function openDialog() {
	render(<CrmSettingsDialog />)
	fireEvent.click(screen.getByRole('button', { name: /Configurar/ }))
	await screen.findByText('Etiquetas')
}

describe('suggestFieldKey', () => {
	it.each([
		['Fecha de cierre', 'fecha_de_cierre'],
		['Ingresos (COP)', 'ingresos_cop'],
		['2do producto', 'f_2do_producto'],
		['Ñandú', 'nandu'],
	])('%s → %s', (label, key) => {
		expect(suggestFieldKey(label)).toBe(key)
	})
})

describe('CrmSettingsDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(fetchTagOptions).mockResolvedValue([{ idLeadTag: 1, name: 'VIP', color: '#f00' }])
		vi.mocked(fetchCustomFields).mockResolvedValue([
			{ idLeadCustomField: 4, key: 'product', label: 'Producto', type: 'SELECT', options: ['A', 'B'], position: 0 },
		])
	})

	it('loads only when opened', async () => {
		render(<CrmSettingsDialog />)
		expect(fetchTagOptions).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole('button', { name: /Configurar/ }))
		expect(await screen.findByText('VIP')).toBeInTheDocument()
		expect(screen.getByText('Producto')).toBeInTheDocument()
	})

	it('creates and deletes tags', async () => {
		vi.mocked(createTag).mockResolvedValue({ idLeadTag: 2, name: 'Referido', color: '#64748b' })
		vi.mocked(deleteTag).mockResolvedValue()
		await openDialog()
		fireEvent.change(screen.getByLabelText('Nueva etiqueta'), { target: { value: 'Referido' } })
		fireEvent.click(screen.getAllByRole('button', { name: 'Agregar' })[0])
		await waitFor(() => expect(createTag).toHaveBeenCalledWith({ name: 'Referido', color: '#64748b' }))
		fireEvent.click(screen.getByRole('button', { name: 'Eliminar etiqueta VIP' }))
		await waitFor(() => expect(deleteTag).toHaveBeenCalledWith(1))
	})

	it('creates a list field with a suggested key and parsed options', async () => {
		vi.mocked(createCustomField).mockResolvedValue({ idLeadCustomField: 5, key: 'canal', label: 'Canal', type: 'SELECT', options: ['Web', 'Referido'], position: 0 })
		await openDialog()
		fireEvent.change(screen.getByLabelText('Nombre del campo'), { target: { value: 'Canal' } })
		fireEvent.change(screen.getByLabelText('Tipo de campo'), { target: { value: 'SELECT' } })
		fireEvent.change(screen.getByLabelText('Opciones separadas por coma'), { target: { value: 'Web, Referido, ' } })
		fireEvent.click(screen.getAllByRole('button', { name: 'Agregar' })[1])
		await waitFor(() =>
			expect(createCustomField).toHaveBeenCalledWith({ key: 'canal', label: 'Canal', type: 'SELECT', options: ['Web', 'Referido'] })
		)
	})

	it('deletes a field and shows server errors', async () => {
		vi.mocked(deleteCustomField).mockRejectedValue(new Error('No fue posible eliminar el campo.'))
		await openDialog()
		fireEvent.click(screen.getByRole('button', { name: 'Eliminar campo Producto' }))
		expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible eliminar el campo.')
	})
})
