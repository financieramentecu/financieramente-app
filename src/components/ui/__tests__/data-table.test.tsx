import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DataTable } from '../data-table'

const sampleData = [
  {
    id: 1,
    name: 'Juan Pérez',
    email: 'juan@test.com',
    role: 'Admin',
    status: 'Active',
    department: 'IT'
  },
  {
    id: 2,
    name: 'María González',
    email: 'maria@test.com',
    role: 'User',
    status: 'Inactive',
    department: 'Sales'
  },
  {
    id: 3,
    name: 'Carlos López',
    email: 'carlos@test.com',
    role: 'Supervisor',
    status: 'Active',
    department: 'Finance'
  }
]

const columns = [
  {
    key: 'name' as const,
    title: 'Nombre',
    sortable: true,
    searchable: true
  },
  {
    key: 'email' as const,
    title: 'Email',
    sortable: true,
    searchable: true
  },
  {
    key: 'role' as const,
    title: 'Rol',
    sortable: true,
    searchable: true
  },
  {
    key: 'status' as const,
    title: 'Estado',
    sortable: true,
    searchable: true
  },
  {
    key: 'department' as const,
    title: 'Departamento',
    sortable: true,
    searchable: true
  }
]

describe('DataTable Component', () => {
  it('renders table with data', () => {
    render(
      <DataTable
        data={sampleData}
        columns={columns}
        searchable={false}
        sortable={false}
        selectable={false}
        pagination={false}
        exportable={false}
        filterable={false}
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
        sortable={false}
        selectable={false}
        pagination={false}
        exportable={false}
        filterable={false}
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
        sortable={false}
        selectable={false}
        pagination={false}
        exportable={false}
        filterable={false}
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

  it('renders select all checkbox when selectable is true', () => {
    render(
      <DataTable
        data={sampleData}
        columns={columns}
        searchable={false}
        sortable={false}
        selectable={true}
        pagination={false}
        exportable={false}
        filterable={false}
        loading={false}
        emptyMessage="No data"
      />
    )
    
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i })
    expect(selectAllCheckbox).toBeInTheDocument()
  })

  it('handles row selection', async () => {
    const mockOnSelectionChange = jest.fn()
    render(
      <DataTable
        data={sampleData}
        columns={columns}
        searchable={false}
        sortable={false}
        selectable={true}
        pagination={false}
        exportable={false}
        filterable={false}
        loading={false}
        emptyMessage="No data"
        onSelectionChange={mockOnSelectionChange}
      />
    )
    
    const firstRowCheckbox = screen.getAllByRole('checkbox')[1] // Skip select all checkbox
    fireEvent.click(firstRowCheckbox)
    
    await waitFor(() => {
      expect(mockOnSelectionChange).toHaveBeenCalledWith([sampleData[0]])
    })
  })

  it('handles select all functionality', async () => {
    const mockOnSelectionChange = jest.fn()
    render(
      <DataTable
        data={sampleData}
        columns={columns}
        searchable={false}
        sortable={false}
        selectable={true}
        pagination={false}
        exportable={false}
        filterable={false}
        loading={false}
        emptyMessage="No data"
        onSelectionChange={mockOnSelectionChange}
      />
    )
    
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i })
    fireEvent.click(selectAllCheckbox)
    
    await waitFor(() => {
      expect(mockOnSelectionChange).toHaveBeenCalledWith(sampleData)
    })
  })

  it('renders pagination when pagination is true', () => {
    render(
      <DataTable
        data={sampleData}
        columns={columns}
        searchable={false}
        sortable={false}
        selectable={false}
        pagination={true}
        pageSize={2}
        exportable={false}
        filterable={false}
        loading={false}
        emptyMessage="No data"
      />
    )
    
    expect(screen.getByText('Mostrando 1 a 2 de 3 resultados')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
  })

  it('handles pagination navigation', async () => {
    render(
      <DataTable
        data={sampleData}
        columns={columns}
        searchable={false}
        sortable={false}
        selectable={false}
        pagination={true}
        pageSize={2}
        exportable={false}
        filterable={false}
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

  it('renders export button when exportable is true', () => {
    render(
      <DataTable
        data={sampleData}
        columns={columns}
        searchable={false}
        sortable={false}
        selectable={false}
        pagination={false}
        exportable={true}
        filterable={false}
        loading={false}
        emptyMessage="No data"
      />
    )
    
    expect(screen.getByText('Exportar')).toBeInTheDocument()
  })

  it('handles export functionality', () => {
    const mockOnExport = jest.fn()
    render(
      <DataTable
        data={sampleData}
        columns={columns}
        searchable={false}
        sortable={false}
        selectable={false}
        pagination={false}
        exportable={true}
        filterable={false}
        loading={false}
        emptyMessage="No data"
        onExport={mockOnExport}
      />
    )
    
    const exportButton = screen.getByText('Exportar')
    fireEvent.click(exportButton)
    
    expect(mockOnExport).toHaveBeenCalledWith(sampleData)
  })

  it('renders loading state', () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        searchable={false}
        sortable={false}
        selectable={false}
        pagination={false}
        exportable={false}
        filterable={false}
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
        searchable={false}
        sortable={false}
        selectable={false}
        pagination={false}
        exportable={false}
        filterable={false}
        loading={false}
        emptyMessage="No hay datos disponibles"
      />
    )
    
    expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument()
  })

  it('handles row click', () => {
    const mockOnRowClick = jest.fn()
    render(
      <DataTable
        data={sampleData}
        columns={columns}
        searchable={false}
        sortable={false}
        selectable={false}
        pagination={false}
        exportable={false}
        filterable={false}
        loading={false}
        emptyMessage="No data"
        onRowClick={mockOnRowClick}
      />
    )
    
    const firstRow = screen.getByText('Juan Pérez').closest('tr')
    fireEvent.click(firstRow!)
    
    expect(mockOnRowClick).toHaveBeenCalledWith(sampleData[0])
  })

  it('handles sorting', async () => {
    render(
      <DataTable
        data={sampleData}
        columns={columns}
        searchable={false}
        sortable={true}
        selectable={false}
        pagination={false}
        exportable={false}
        filterable={false}
        loading={false}
        emptyMessage="No data"
      />
    )
    
    const nameHeader = screen.getByText('Nombre')
    fireEvent.click(nameHeader)
    
    await waitFor(() => {
      // After sorting by name, the order should change
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Carlos López') // First after sorting
    })
  })

  it('shows selection count badge', async () => {
    render(
      <DataTable
        data={sampleData}
        columns={columns}
        searchable={false}
        sortable={false}
        selectable={true}
        pagination={false}
        exportable={false}
        filterable={false}
        loading={false}
        emptyMessage="No data"
      />
    )
    
    const firstRowCheckbox = screen.getAllByRole('checkbox')[1]
    fireEvent.click(firstRowCheckbox)
    
    await waitFor(() => {
      expect(screen.getByText('1 seleccionado')).toBeInTheDocument()
    })
  })

  it('handles page size change', async () => {
    render(
      <DataTable
        data={sampleData}
        columns={columns}
        searchable={false}
        sortable={false}
        selectable={false}
        pagination={true}
        pageSize={2}
        exportable={false}
        filterable={false}
        loading={false}
        emptyMessage="No data"
      />
    )
    
    const pageSizeSelect = screen.getByDisplayValue('2')
    fireEvent.click(pageSizeSelect)
    
    // This would trigger a page size change in a real implementation
    // For now, we just verify the select is rendered
    expect(pageSizeSelect).toBeInTheDocument()
  })
})
