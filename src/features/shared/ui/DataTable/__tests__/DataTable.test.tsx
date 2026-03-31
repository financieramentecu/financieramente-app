import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DataTable } from '../DataTable'
import { ColumnDef } from '@tanstack/react-table'

// Mock de Next.js navigation (por si se usa useDataTableURLState en el futuro)
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
	usePathname: () => '/',
	useSearchParams: () => new URLSearchParams(),
}))

interface TestData {
	id: string
	name: string
	value: number
}

const columns: ColumnDef<TestData>[] = [
	{
		accessorKey: 'name',
		header: 'Nombre',
	},
	{
		accessorKey: 'value',
		header: 'Valor',
	},
]

const data: TestData[] = [
	{ id: '1', name: 'Item 1', value: 100 },
	{ id: '2', name: 'Item 2', value: 200 },
	{ id: '3', name: 'Item 3', value: 300 },
]

describe('DataTable', () => {
	it('debe renderizar correctamente los datos', () => {
		render(<DataTable columns={columns} data={data} />)

		expect(screen.getByText('Item 1')).toBeInTheDocument()
		expect(screen.getByText('Item 2')).toBeInTheDocument()
		expect(screen.getByText('Item 3')).toBeInTheDocument()
	})

	it('debe mostrar mensaje de vacío cuando no hay datos', () => {
		render(<DataTable columns={columns} data={[]} emptyMessage="No hay nada" />)

		expect(screen.getByText('No hay nada')).toBeInTheDocument()
	})

	it('debe mostrar skeletons cuando está cargando', () => {
		render(<DataTable columns={columns} data={data} loading={true} />)

		// Buscamos los elementos con la clase skeleton
		const skeletons = screen.getAllByRole('cell').filter((cell) =>
			cell.innerHTML.includes('skeleton')
		)
		expect(skeletons.length).toBeGreaterThan(0)
	})

	it('debe filtrar los datos mediante la búsqueda global', async () => {
		render(
			<DataTable
				columns={columns}
				data={data}
				searchable={true}
				searchColumn="name"
				searchDebounceMs={0}
			/>
		)

		const searchInput = screen.getByPlaceholderText('Buscar...')
		fireEvent.change(searchInput, { target: { value: 'Item 1' } })

		// Con searchDebounceMs={0}, el filtrado debería ser inmediato o en el siguiente tick
		expect(screen.getByText('Item 1')).toBeInTheDocument()
		expect(screen.queryByText('Item 2')).not.toBeInTheDocument()
	})

	it('debe manejar la selección de filas si selectable es true', () => {
		render(<DataTable columns={columns} data={data} selectable={true} />)

		const checkboxes = screen.getAllByRole('checkbox')
		// 1 header + 3 filas = 4 checkboxes
		expect(checkboxes.length).toBe(4)

		fireEvent.click(checkboxes[1]) // Seleccionar primera fila
		expect(checkboxes[1]).toBeChecked()
	})

	it('debe disparar onRowClick cuando se hace click en una fila', () => {
		const onRowClick = vi.fn()
		render(<DataTable columns={columns} data={data} onRowClick={onRowClick} />)

		const firstRow = screen.getByText('Item 1').closest('tr')
		if (firstRow) fireEvent.click(firstRow)

		expect(onRowClick).toHaveBeenCalledWith(data[0])
	})
})
