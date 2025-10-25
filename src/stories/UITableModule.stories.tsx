import type { Meta, StoryObj } from '@storybook/nextjs';
import {
  TableModule,
  TableConfigs,
  createColumnDefs,
} from '../components/ui/table-module';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

// Types
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
  department: string;
  salary: number;
}

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  createdAt: string;
}

interface Order {
  id: string;
  customer: string;
  total: number;
  status: string;
  orderDate: string;
  deliveryDate: string;
}

// Sample data
const usersData: User[] = [
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

const productsData: Product[] = [
  {
    id: 1,
    name: 'Laptop Dell XPS 13',
    category: 'Electrónicos',
    price: 1299.99,
    stock: 15,
    status: 'Disponible',
    createdAt: '2024-01-10',
  },
  {
    id: 2,
    name: 'Mouse Logitech MX Master',
    category: 'Accesorios',
    price: 99.99,
    stock: 0,
    status: 'Agotado',
    createdAt: '2024-01-08',
  },
  {
    id: 3,
    name: 'Teclado Mecánico Razer',
    category: 'Accesorios',
    price: 149.99,
    stock: 8,
    status: 'Disponible',
    createdAt: '2024-01-12',
  },
];

const ordersData: Order[] = [
  {
    id: 'ORD-001',
    customer: 'Juan Pérez',
    total: 1299.99,
    status: 'Completado',
    orderDate: '2024-01-15',
    deliveryDate: '2024-01-20',
  },
  {
    id: 'ORD-002',
    customer: 'María González',
    total: 249.98,
    status: 'Pendiente',
    orderDate: '2024-01-16',
    deliveryDate: '2024-01-22',
  },
  {
    id: 'ORD-003',
    customer: 'Carlos López',
    total: 99.99,
    status: 'Cancelado',
    orderDate: '2024-01-14',
    deliveryDate: '2024-01-18',
  },
];

const meta: Meta<typeof TableModule<User>> = {
  title: 'UI/TableModule',
  component: TableModule,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Componente modular de tabla basado en TanStack Table con configuración flexible y reutilizable. Incluye funcionalidades avanzadas como búsqueda, ordenamiento, paginación, selección múltiple y exportación.',
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
      description: 'Configuración de columnas usando createColumnDefs',
    },
    title: {
      control: 'text',
      description: 'Título de la tabla',
    },
    description: {
      control: 'text',
      description: 'Descripción de la tabla',
    },
    searchable: {
      control: 'boolean',
      description: 'Habilitar búsqueda en la tabla',
    },
    searchColumn: {
      control: 'text',
      description: 'Columna específica para búsqueda',
    },
    paginable: {
      control: 'boolean',
      description: 'Habilitar paginación',
    },
    selectable: {
      control: 'boolean',
      description: 'Habilitar selección múltiple',
    },
    exportable: {
      control: 'boolean',
      description: 'Habilitar exportación',
    },
    filterable: {
      control: 'boolean',
      description: 'Habilitar filtros de columnas',
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
type Story = StoryObj<typeof TableModule<User>>;

// Pre-configured stories using TableConfigs
export const UsersTable: Story = {
  args: {
    data: usersData,
    // @ts-expect-error - Complex generic type inference
    columns: TableConfigs.users.columns,
    title: 'Gestión de Usuarios',
    description:
      'Administra los usuarios del sistema con funcionalidades completas de CRUD',
    searchColumn: TableConfigs.users.searchColumn,
    defaultPageSize: TableConfigs.users.defaultPageSize,
    onRowClick: (row: User) => toast.info(`Usuario seleccionado: ${row.name}`),
    onSelectionChange: (selectedRows: User[]) =>
      toast.info(`${selectedRows.length} usuarios seleccionados`),
    onExport: (data: User[]) =>
      toast.success(`Exportando ${data.length} usuarios`),
    onEdit: (row: User) => toast.info(`Editando usuario: ${row.name}`),
    onDelete: (row: User) => toast.error(`Eliminando usuario: ${row.name}`),
    onView: (row: User) => toast.info(`Viendo detalles de: ${row.name}`),
  },
};

export const ProductsTable: StoryObj<typeof TableModule<Product>> = {
  args: {
    data: productsData,
    // @ts-expect-error - Complex generic type inference
    columns: TableConfigs.products.columns,
    title: 'Catálogo de Productos',
    description: 'Gestiona el inventario de productos disponibles',
    searchColumn: TableConfigs.products.searchColumn,
    defaultPageSize: TableConfigs.products.defaultPageSize,
    onRowClick: (row: Product) =>
      toast.info(`Producto seleccionado: ${row.name}`),
    onSelectionChange: (selectedRows: Product[]) =>
      toast.info(`${selectedRows.length} productos seleccionados`),
    onExport: (data: Product[]) =>
      toast.success(`Exportando ${data.length} productos`),
    onEdit: (row: Product) => toast.info(`Editando producto: ${row.name}`),
    onDelete: (row: Product) => toast.error(`Eliminando producto: ${row.name}`),
    onView: (row: Product) => toast.info(`Viendo detalles de: ${row.name}`),
  },
};

export const OrdersTable: StoryObj<typeof TableModule<Order>> = {
  args: {
    data: ordersData,
    // @ts-expect-error - Complex generic type inference
    columns: TableConfigs.orders.columns,
    title: 'Gestión de Pedidos',
    description: 'Seguimiento y administración de pedidos de clientes',
    searchColumn: TableConfigs.orders.searchColumn,
    defaultPageSize: TableConfigs.orders.defaultPageSize,
    onRowClick: (row: Order) => toast.info(`Pedido seleccionado: ${row.id}`),
    onSelectionChange: (selectedRows: Order[]) =>
      toast.info(`${selectedRows.length} pedidos seleccionados`),
    onExport: (data: Order[]) =>
      toast.success(`Exportando ${data.length} pedidos`),
    onEdit: (row: Order) => toast.info(`Editando pedido: ${row.id}`),
    onDelete: (row: Order) => toast.error(`Eliminando pedido: ${row.id}`),
    onView: (row: Order) => toast.info(`Viendo detalles de: ${row.id}`),
  },
};

// Custom configuration story
export const CustomTable: Story = {
  args: {
    data: usersData,
    columns: [
      createColumnDefs.text('name' as keyof User, 'Nombre Completo', {
        searchable: true,
      }),
      createColumnDefs.text('email' as keyof User, 'Correo Electrónico', {
        searchable: true,
      }),
      createColumnDefs.badge('role' as keyof User, 'Tipo de Usuario', {
        getVariant: (role: unknown) => {
          switch (String(role)) {
            case 'Administrador':
              return 'default';
            case 'Supervisor':
              return 'secondary';
            default:
              return 'outline';
          }
        },
      }),
      createColumnDefs.currency('salary' as keyof User, 'Salario Mensual', {
        currency: 'USD',
      }),
    ],
    title: 'Tabla Personalizada',
    description: 'Ejemplo de tabla con configuración personalizada',
    searchColumn: 'name',
    defaultPageSize: 5,
    pageSizeOptions: [5, 10, 15],
    onRowClick: (row: User) => toast.info(`Usuario: ${row.name}`),
    onSelectionChange: (selectedRows: User[]) =>
      toast.info(`${selectedRows.length} seleccionados`),
    onExport: (data: User[]) =>
      toast.success(`Exportando ${data.length} registros`),
    customActions: (row: User) => (
      <div className="flex space-x-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast.info(`Ver ${row.name}`)}
        >
          Ver
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast.info(`Editar ${row.name}`)}
        >
          Editar
        </Button>
      </div>
    ),
  },
};

// Minimal table
export const MinimalTable: Story = {
  args: {
    data: usersData.slice(0, 3),
    columns: [
      createColumnDefs.text('name' as keyof User, 'Nombre'),
      createColumnDefs.text('email' as keyof User, 'Email'),
    ],
    title: 'Tabla Mínima',
    description: 'Tabla simple sin funcionalidades adicionales',
    searchable: false,
    paginable: false,
    selectable: false,
    exportable: false,
    filterable: false,
  },
};

// Loading state
export const LoadingTable: Story = {
  args: {
    data: [],
    // @ts-expect-error - Complex generic type inference
    columns: TableConfigs.users.columns,
    title: 'Tabla Cargando',
    description: 'Estado de carga de la tabla',
    loading: true,
  },
};

// Empty state
export const EmptyTable: Story = {
  args: {
    data: [],
    // @ts-expect-error - Complex generic type inference
    columns: TableConfigs.users.columns,
    title: 'Tabla Vacía',
    description: 'Estado cuando no hay datos',
    emptyMessage: 'No se encontraron usuarios en el sistema',
  },
};

// Large dataset
export const LargeDataset: Story = {
  args: {
    data: Array.from(
      { length: 100 },
      (_, i): User => ({
        id: i + 1,
        name: `Usuario ${i + 1}`,
        email: `usuario${i + 1}@financieramente.com`,
        role: ['Administrador', 'Usuario', 'Supervisor'][i % 3],
        status: ['Activo', 'Inactivo'][i % 2],
        lastLogin: `2024-01-${String((i % 15) + 1).padStart(2, '0')}`,
        department: ['IT', 'Ventas', 'Finanzas', 'RRHH'][i % 4],
        salary: (i % 5) * 1000 + 2000,
      })
    ),
    // @ts-expect-error - Complex generic type inference
    columns: TableConfigs.users.columns,
    title: 'Dataset Grande',
    description: 'Tabla con 100 registros para probar paginación',
    searchColumn: TableConfigs.users.searchColumn,
    defaultPageSize: 10,
    onRowClick: (row: User) => toast.info(`Usuario: ${row.name}`),
    onSelectionChange: (selectedRows: User[]) =>
      toast.info(`${selectedRows.length} seleccionados`),
    onExport: (data: User[]) =>
      toast.success(`Exportando ${data.length} registros`),
  },
};

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Tabla de Usuarios</h3>
        <TableModule<User>
          data={usersData}
          // @ts-expect-error - Complex generic type inference
          columns={TableConfigs.users.columns}
          title="Usuarios del Sistema"
          searchColumn={TableConfigs.users.searchColumn}
          defaultPageSize={5}
          onRowClick={(row: User) => toast.info(`Usuario: ${row.name}`)}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Tabla de Productos</h3>
        <TableModule<Product>
          data={productsData}
          // @ts-expect-error - Complex generic type inference
          columns={TableConfigs.products.columns}
          title="Inventario de Productos"
          searchColumn={TableConfigs.products.searchColumn}
          defaultPageSize={10}
          onRowClick={(row: Product) => toast.info(`Producto: ${row.name}`)}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Tabla Mínima</h3>
        <TableModule<User>
          data={usersData.slice(0, 3)}
          columns={[
            createColumnDefs.text('name' as keyof User, 'Nombre'),
            createColumnDefs.text('email' as keyof User, 'Email'),
          ]}
          searchable={false}
          paginable={false}
          selectable={false}
          exportable={false}
          filterable={false}
        />
      </div>
    </div>
  ),
};
