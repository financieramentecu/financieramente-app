import type { Meta, StoryObj } from '@storybook/nextjs'
import { DataTable } from '../components/ui/DataTable'
import { ThemeProvider } from '../hooks/use-theme'
import { mockBusinessList } from '../data/mockBusinessData'
import { Business } from '../types/business'
import { DataTableColumn } from '../types/dashboard'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'

const meta: Meta<typeof DataTable> = {
  title: 'UI/DataTableGeneric',
  component: DataTable,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Tabla genérica reutilizable para mostrar cualquier tipo de datos.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div className="w-full max-w-6xl">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ]
}

export default meta
type Story = StoryObj<typeof meta>

// Configuración de columnas para la tabla de negocios
const businessColumns: DataTableColumn<Record<string, unknown>>[] = [
  {
    key: 'identification',
    header: 'Identificación',
    cellRenderer: (value) => (
      <span className="font-medium">{value}</span>
    )
  },
  {
    key: 'user',
    header: 'Usuario',
    cellRenderer: (user) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>
            {user.name.split(' ').map((n: string) => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{user.name}</span>
      </div>
    )
  },
  {
    key: 'email',
    header: 'Email',
    cellRenderer: (value) => (
      <span className="text-muted-foreground">{value}</span>
    )
  },
  {
    key: 'value',
    header: 'Valor',
    cellRenderer: (value) => (
      <span className="font-medium">
        {new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0
        }).format(value)}
      </span>
    )
  },
  {
    key: 'status',
    header: 'Estado',
    cellRenderer: (value) => (
      <Badge 
        variant={value === 'Emitido' ? "default" : "secondary"}
        className={value === 'Emitido' ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}
      >
        {value}
      </Badge>
    )
  },
  {
    key: 'actions',
    header: 'Acciones',
    cellRenderer: (_, row) => (
      <Button variant="outline" size="sm">
        Editar
      </Button>
    )
  }
]

export const Default: Story = {
  args: {
    columns: businessColumns,
    data: mockBusinessList,
    searchable: true,
    onGlobalSearch: (query) => console.log('Search:', query),
    pagination: {
      currentPage: 1,
      pageSize: 10,
      totalItems: mockBusinessList.length,
      onPageChange: (page) => console.log('Page changed:', page)
    }
  }
}

export const WithoutSearch: Story = {
  args: {
    columns: businessColumns,
    data: mockBusinessList.slice(0, 5),
    searchable: false,
    pagination: {
      currentPage: 1,
      pageSize: 5,
      totalItems: 5,
      onPageChange: (page) => console.log('Page changed:', page)
    }
  }
}

export const EmptyState: Story = {
  args: {
    columns: businessColumns,
    data: [],
    searchable: true,
    onGlobalSearch: (query) => console.log('Search:', query)
  }
}

export const LoadingState: Story = {
  args: {
    columns: businessColumns,
    data: [],
    loading: true,
    searchable: true,
    onGlobalSearch: (query) => console.log('Search:', query)
  }
}

export const WithoutPagination: Story = {
  args: {
    columns: businessColumns,
    data: mockBusinessList.slice(0, 3),
    searchable: true,
    onGlobalSearch: (query) => console.log('Search:', query)
  }
}
