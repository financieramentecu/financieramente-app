import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DataTable } from '../DataTable/DataTable'
import type { ColumnDef } from '@tanstack/react-table'

const sampleData = [
	{
		id: 1,
		name: 'Juan Pérez',
		email: 'juan@test.com',
		role: 'Admin',
		status: 'Active',
		department: 'IT',
	},
	{
		id: 2,
		name: 'María González',
		email: 'maria@test.com',
		role: 'User',
		status: 'Inactive',
		department: 'Sales',
	},
	{
		id: 3,
		name: 'Carlos López',
		email: 'carlos@test.com',
		role: 'Supervisor',
		status: 'Active',
		department: 'Finance',
	},
]

const columns: ColumnDef<any>[] = [
	{
		accessorKey: 'name',
		header: 'Nombre',
	},
	{
		accessorKey: 'email',
		header: 'Email',
	},
	{
		accessorKey: 'role',
		header: 'Rol',
	},
	{
		accessorKey: 'status',
		header: 'Estado',
	},
	{
		accessorKey: 'department',
		header: 'Departamento',
	},
]

describe('DataTable Component', () => {
	it('renders table with data', () => {
		render(
			<DataTable
				data={sampleData}
				columns={columns}
				loading={false}
				emptyMessage="No data"
			/>
		)

		expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
		expect(screen.getByText('María González')).toBeInTheDocument()
		expect(screen.getByText('Carlos López')).toBeInTheDocument()
	})

	it('renders search input when searchable is true', () => {
		render(
			<DataTable
				data={sampleData}
				columns={columns}
				searchable={true}
				loading={false}
				emptyMessage="No data"
			/>
		)

		expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument()
	})

	it('filters data based on search query', async () => {
		render(
			<DataTable
				data={sampleData}
				columns={columns}
				searchable={true}
				loading={false}
				emptyMessage="No data"
			/>
		)

		const searchInput = screen.getByPlaceholderText('Buscar...')
		fireEvent.change(searchInput, { target: { value: 'Juan' } })

		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
			expect(screen.queryByText('María González')).not.toBeInTheDocument()
		})
	})

	it('renders select all checkbox when onSelectionChange is provided', () => {
		render(
			<DataTable
				data={sampleData}
				columns={columns}
				onSelectionChange={() => {}}
				loading={false}
				emptyMessage="No data"
			/>
		)

		const checkboxes = screen.queryAllByRole('checkbox')
		expect(checkboxes.length).toBeGreaterThan(0)
		expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
	})

	it('handles row selection', async () => {
		const mockOnSelectionChange = vi.fn()
		render(
			<DataTable
				data={sampleData}
				columns={columns}
				onSelectionChange={mockOnSelectionChange}
				loading={false}
				emptyMessage="No data"
			/>
		)

		const checkboxes = screen.getAllByRole('checkbox')
		const firstRowCheckbox = checkboxes[1] // Skip select all checkbox
		fireEvent.click(firstRowCheckbox)

		await waitFor(() => {
			expect(mockOnSelectionChange).toHaveBeenCalled()
		})
	})

	it('renders pagination when data is larger than pageSize', () => {
		render(
			<DataTable
				data={sampleData}
				columns={columns}
				pageSize={2}
				loading={false}
				emptyMessage="No data"
			/>
		)

		expect(
			screen.getByText('Mostrando 1 a 2 de 3 resultados')
		).toBeInTheDocument()
		expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
	})

	it('handles pagination navigation', async () => {
		render(
			<DataTable
				data={sampleData}
				columns={columns}
				pageSize={2}
				loading={false}
				emptyMessage="No data"
			/>
		)

		const nextButton = screen.getByText('Siguiente')
		fireEvent.click(nextButton)

		await waitFor(() => {
			expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
		})
	})

	it('renders export button when onExport is provided', () => {
		render(
			<DataTable
				data={sampleData}
				columns={columns}
				onExport={() => {}}
				loading={false}
				emptyMessage="No data"
			/>
		)

		expect(screen.getByText('Exportar')).toBeInTheDocument()
	})

	it('renders loading state', () => {
		render(
			<DataTable
				data={[]}
				columns={columns}
				loading={true}
				emptyMessage="No data"
			/>
		)

		expect(screen.getByText('Cargando...')).toBeInTheDocument()
	})

	it('renders empty state', () => {
		render(
			<DataTable
				data={[]}
				columns={columns}
				loading={false}
				emptyMessage="No hay datos disponibles"
			/>
		)

		expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument()
	})

	it('handles row click', () => {
		const mockOnRowClick = vi.fn()
		render(
			<DataTable
				data={sampleData}
				columns={columns}
				loading={false}
				emptyMessage="No data"
				onRowClick={mockOnRowClick}
			/>
		)

		const firstRow = screen.getByText('Juan Pérez').closest('tr')
		fireEvent.click(firstRow!)

		expect(mockOnRowClick).toHaveBeenCalled()
	})
})
