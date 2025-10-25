import type { Meta, StoryObj } from '@storybook/nextjs';
import {
  DataTable,
  type Column,
  type DataTableProps,
} from '../components/ui/data-table';
import { Badge } from '../components/ui/badge';

// Datos de ejemplo
const sampleData = [
  {
    id: 1,
    name: 'Juan Pérez',
    email: 'juan.perez@financieramente.com',
    role: 'Administrador',
    status: 'Activo',
    lastLogin: '2024-01-15',
    department: 'IT',
    salary: 5000,
  },
  {
    id: 2,
    name: 'María González',
    email: 'maria.gonzalez@financieramente.com',
    role: 'Usuario',
    status: 'Activo',
    lastLogin: '2024-01-14',
    department: 'Ventas',
    salary: 3500,
  },
  {
    id: 3,
    name: 'Carlos López',
    email: 'carlos.lopez@financieramente.com',
    role: 'Supervisor',
    status: 'Inactivo',
    lastLogin: '2024-01-10',
    department: 'Finanzas',
    salary: 4200,
  },
  {
    id: 4,
    name: 'Ana Martínez',
    email: 'ana.martinez@financieramente.com',
    role: 'Usuario',
    status: 'Activo',
    lastLogin: '2024-01-15',
    department: 'RRHH',
    salary: 3800,
  },
  {
    id: 5,
    name: 'Luis Rodríguez',
    email: 'luis.rodriguez@financieramente.com',
    role: 'Administrador',
    status: 'Activo',
    lastLogin: '2024-01-15',
    department: 'IT',
    salary: 5500,
  },
];

type UserRow = (typeof sampleData)[number];

const columns: Column<UserRow>[] = [
  {
    key: 'name' as const,
    title: 'Nombre',
    sortable: true,
    searchable: true,
    render: (value) => <div className="font-medium">{String(value)}</div>,
  },
  {
    key: 'email' as const,
    title: 'Email',
    sortable: true,
    searchable: true,
  },
  {
    key: 'role' as const,
    title: 'Rol',
    sortable: true,
    searchable: true,
    render: (value) => {
      const role = String(value);
      return (
        <Badge variant={role === 'Administrador' ? 'default' : 'secondary'}>
          {role}
        </Badge>
      );
    },
  },
  {
    key: 'status' as const,
    title: 'Estado',
    sortable: true,
    searchable: true,
    render: (value) => {
      const status = String(value);
      return (
        <Badge variant={status === 'Activo' ? 'default' : 'destructive'}>
          {status}
        </Badge>
      );
    },
  },
  {
    key: 'department' as const,
    title: 'Departamento',
    sortable: true,
    searchable: true,
  },
  {
    key: 'lastLogin' as const,
    title: 'Último Acceso',
    sortable: true,
    searchable: false,
  },
  {
    key: 'salary' as const,
    title: 'Salario',
    sortable: true,
    searchable: false,
    align: 'right' as const,
    render: (value) => `$${Number(value).toLocaleString()}`,
  },
];

const DataTableForUsers = (props: DataTableProps<UserRow>) => (
  <DataTable<UserRow> {...props} />
);

const meta: Meta<typeof DataTableForUsers> = {
  title: 'UI/DataTable',
  component: DataTableForUsers,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Tabla de datos avanzada con funcionalidades de búsqueda, ordenamiento, paginación, selección múltiple y exportación. Cumple con estándares WCAG AA de accesibilidad.',
      },
    },
  },
  argTypes: {
    data: {
      control: false,
      description: 'Array de datos para mostrar en la tabla',
    },
    columns: {
      control: false,
      description: 'Configuración de columnas de la tabla',
    },
    searchable: {
      control: 'boolean',
      description: 'Habilitar búsqueda en la tabla',
    },
    sortable: {
      control: 'boolean',
      description: 'Habilitar ordenamiento de columnas',
    },
    selectable: {
      control: 'boolean',
      description: 'Habilitar selección múltiple de filas',
    },
    pagination: {
      control: 'boolean',
      description: 'Habilitar paginación',
    },
    pageSize: {
      control: 'number',
      description: 'Número de elementos por página',
    },
    exportable: {
      control: 'boolean',
      description: 'Habilitar exportación de datos',
    },
    filterable: {
      control: 'boolean',
      description: 'Habilitar filtros',
    },
    loading: {
      control: 'boolean',
      description: 'Estado de carga',
    },
    emptyMessage: {
      control: 'text',
      description: 'Mensaje cuando no hay datos',
    },
  },
};

export default meta;
type Story = StoryObj<typeof DataTableForUsers>;

export const Default: Story = {
  args: {
    data: sampleData,
    columns: columns,
    searchable: true,
    sortable: true,
    selectable: true,
    pagination: true,
    pageSize: 10,
    exportable: true,
    filterable: true,
    loading: false,
    emptyMessage: 'No hay usuarios disponibles',
  },
};

export const WithoutPagination: Story = {
  args: {
    data: sampleData,
    columns: columns,
    searchable: true,
    sortable: true,
    selectable: true,
    pagination: false,
    exportable: true,
    filterable: true,
    loading: false,
    emptyMessage: 'No hay usuarios disponibles',
  },
};

export const WithoutSelection: Story = {
  args: {
    data: sampleData,
    columns: columns,
    searchable: true,
    sortable: true,
    selectable: false,
    pagination: true,
    pageSize: 5,
    exportable: true,
    filterable: true,
    loading: false,
    emptyMessage: 'No hay usuarios disponibles',
  },
};

export const WithoutSearch: Story = {
  args: {
    data: sampleData,
    columns: columns,
    searchable: false,
    sortable: true,
    selectable: true,
    pagination: true,
    pageSize: 10,
    exportable: true,
    filterable: true,
    loading: false,
    emptyMessage: 'No hay usuarios disponibles',
  },
};

export const Loading: Story = {
  args: {
    data: [],
    columns: columns,
    searchable: true,
    sortable: true,
    selectable: true,
    pagination: true,
    pageSize: 10,
    exportable: true,
    filterable: true,
    loading: true,
    emptyMessage: 'No hay usuarios disponibles',
  },
};

export const Empty: Story = {
  args: {
    data: [],
    columns: columns,
    searchable: true,
    sortable: true,
    selectable: true,
    pagination: true,
    pageSize: 10,
    exportable: true,
    filterable: true,
    loading: false,
    emptyMessage:
      'No se encontraron usuarios que coincidan con los criterios de búsqueda',
  },
};

export const LargeDataset: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Usuario ${i + 1}`,
      email: `usuario${i + 1}@financieramente.com`,
      role: ['Administrador', 'Usuario', 'Supervisor'][i % 3],
      status: ['Activo', 'Inactivo'][i % 2],
      lastLogin: `2024-01-${String((i % 15) + 1).padStart(2, '0')}`,
      department: ['IT', 'Ventas', 'Finanzas', 'RRHH'][i % 4],
      salary: (i % 5) * 1000 + 2000,
    })),
    columns: columns,
    searchable: true,
    sortable: true,
    selectable: true,
    pagination: true,
    pageSize: 10,
    exportable: true,
    filterable: true,
    loading: false,
    emptyMessage: 'No hay usuarios disponibles',
  },
};

export const MinimalTable: Story = {
  args: {
    data: sampleData.slice(0, 3),
    columns: [
      {
        key: 'name' as const,
        title: 'Nombre',
        sortable: false,
        searchable: false,
      },
      {
        key: 'email' as const,
        title: 'Email',
        sortable: false,
        searchable: false,
      },
    ],
    searchable: false,
    sortable: false,
    selectable: false,
    pagination: false,
    exportable: false,
    filterable: false,
    loading: false,
    emptyMessage: 'Sin datos',
  },
};

export const WithActions: Story = {
  args: {
    data: sampleData,
    columns: columns,
    searchable: true,
    sortable: true,
    selectable: true,
    pagination: true,
    pageSize: 10,
    exportable: true,
    filterable: true,
    loading: false,
    emptyMessage: 'No hay usuarios disponibles',
    onRowClick: (row) => console.log('Row clicked:', row),
    onSelectionChange: (selectedRows) =>
      console.log('Selection changed:', selectedRows),
    onExport: (data) => console.log('Export data:', data),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Tabla Completa</h3>
        <DataTable
          data={sampleData}
          columns={columns}
          searchable={true}
          sortable={true}
          selectable={true}
          pagination={true}
          pageSize={5}
          exportable={true}
          filterable={true}
          loading={false}
          emptyMessage="No hay usuarios disponibles"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Tabla Mínima</h3>
        <DataTable
          data={sampleData.slice(0, 3)}
          columns={columns.slice(0, 3)}
          searchable={false}
          sortable={false}
          selectable={false}
          pagination={false}
          exportable={false}
          filterable={false}
          loading={false}
          emptyMessage="Sin datos"
        />
      </div>
    </div>
  ),
};
