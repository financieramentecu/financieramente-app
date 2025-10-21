import type { Meta, StoryObj } from '@storybook/nextjs'
import type { ColumnDef } from '@tanstack/react-table'
import { TableModule, TableConfigs, createColumnDefs, useTableModule } from '../../components/ui/table-module'
import { Button } from '../../components/ui/button'
import { toast } from 'sonner'

// Example: How to use the modular table system
const meta: Meta = {
  title: 'Examples/TableModule Usage',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Ejemplos prácticos de cómo usar el sistema modular de tablas con diferentes configuraciones y casos de uso.'
      }
    }
  }
}

export default meta

// Example 1: Basic usage with pre-configured table
export const BasicUsage: StoryObj = {
  render: () => {
    const usersData = [
      {
        id: 1,
        name: 'Juan Pérez',
        email: 'juan.perez@financieramente.com',
        role: 'Administrador',
        status: 'Activo',
        lastLogin: '2024-01-15',
        department: 'IT',
        salary: 5000
      },
      {
        id: 2,
        name: 'María González',
        email: 'maria.gonzalez@financieramente.com',
        role: 'Usuario',
        status: 'Activo',
        lastLogin: '2024-01-14',
        department: 'Ventas',
        salary: 3500
      }
    ]

    type UsersRow = (typeof usersData)[number]
    const userColumns = TableConfigs.users.columns as unknown as ColumnDef<UsersRow>[]

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Uso Básico con Configuración Predefinida</h3>
        <p className="text-sm text-muted-foreground">
          Usa TableConfigs para configuraciones comunes como usuarios, productos, pedidos, etc.
        </p>
        
        <TableModule
          data={usersData}
          columns={userColumns}
          title="Gestión de Usuarios"
          description="Administra los usuarios del sistema"
          searchColumn={TableConfigs.users.searchColumn}
          defaultPageSize={TableConfigs.users.defaultPageSize}
          onRowClick={(row) => toast.info(`Usuario seleccionado: ${row.name}`)}
          onEdit={(row) => toast.info(`Editando: ${row.name}`)}
          onDelete={(row) => toast.error(`Eliminando: ${row.name}`)}
        />
      </div>
    )
  }
}

// Example 2: Custom column configuration
export const CustomColumns: StoryObj = {
  render: () => {
    const customData = [
      {
        id: 1,
        productName: 'Laptop Dell XPS 13',
        category: 'Electrónicos',
        price: 1299.99,
        stock: 15,
        status: 'Disponible',
        createdAt: '2024-01-10',
        rating: 4.5
      },
      {
        id: 2,
        productName: 'Mouse Logitech MX Master',
        category: 'Accesorios',
        price: 99.99,
        stock: 0,
        status: 'Agotado',
        createdAt: '2024-01-08',
        rating: 4.8
      }
    ]

    const customColumns = [
      createColumnDefs.text('productName', 'Nombre del Producto', { searchable: true }),
      createColumnDefs.text('category', 'Categoría'),
      createColumnDefs.currency('price', 'Precio', { currency: 'USD' }),
      createColumnDefs.text('stock', 'Stock Disponible'),
      createColumnDefs.badge('status', 'Estado', {
        getVariant: (status: unknown) => {
          const value = String(status)
          switch (value) {
            case 'Disponible': return 'default'
            case 'Agotado': return 'destructive'
            case 'Próximamente': return 'secondary'
            default: return 'outline'
          }
        }
      }),
      createColumnDefs.date('createdAt', 'Fecha de Creación'),
      {
        accessorKey: 'rating',
        header: 'Calificación',
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const rating = Number(getValue())
          return (
            <div className="flex items-center">
              <span className="text-sm font-medium">{rating}</span>
              <span className="text-xs text-muted-foreground ml-1">★</span>
            </div>
          )
        }
      }
    ] as unknown as ColumnDef<(typeof customData)[number]>[]

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configuración de Columnas Personalizada</h3>
        <p className="text-sm text-muted-foreground">
          Crea columnas personalizadas usando createColumnDefs y funciones de renderizado.
        </p>
        
        <TableModule
          data={customData}
          columns={customColumns}
          title="Catálogo de Productos"
          description="Gestión de inventario con columnas personalizadas"
          searchColumn="productName"
          defaultPageSize={10}
          onRowClick={(row) => toast.info(`Producto: ${row.productName}`)}
          onEdit={(row) => toast.info(`Editando: ${row.productName}`)}
        />
      </div>
    )
  }
}

// Example 3: Using the hook for dynamic table creation
export const DynamicTableCreation: StoryObj = {
  render: () => {
    const salesData = [
      {
        id: 1,
        client: 'Empresa ABC',
        amount: 15000,
        date: '2024-01-15',
        status: 'Pagado',
        salesperson: 'Juan Pérez'
      },
      {
        id: 2,
        client: 'Corporación XYZ',
        amount: 25000,
        date: '2024-01-16',
        status: 'Pendiente',
        salesperson: 'María González'
      }
    ]
    const { createTable } = useTableModule<(typeof salesData)[number]>()

    const salesColumns = [
      createColumnDefs.text('client', 'Cliente', { searchable: true }),
      createColumnDefs.currency('amount', 'Monto', { currency: 'USD' }),
      createColumnDefs.date('date', 'Fecha de Venta'),
      createColumnDefs.badge('status', 'Estado', {
        getVariant: (status: unknown) => {
          const value = String(status)
          switch (value) {
            case 'Pagado': return 'default'
            case 'Pendiente': return 'secondary'
            case 'Cancelado': return 'destructive'
            default: return 'outline'
          }
        }
      }),
      createColumnDefs.text('salesperson', 'Vendedor')
    ] as unknown as ColumnDef<(typeof salesData)[number]>[]

    // Create a reusable table component
    const SalesTable = createTable({
      data: salesData,
      columns: salesColumns,
      title: 'Ventas del Mes',
      searchColumn: 'client',
      defaultPageSize: 10
    })

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Creación Dinámica de Tablas</h3>
        <p className="text-sm text-muted-foreground">
          Usa el hook useTableModule para crear componentes de tabla reutilizables.
        </p>
        
        <SalesTable
          onRowClick={(row) => toast.info(`Venta: ${row.client}`)}
          onEdit={(row) => toast.info(`Editando venta: ${row.client}`)}
          onExport={(data) => toast.success(`Exportando ${data.length} ventas`)}
        />
      </div>
    )
  }
}

// Example 4: Minimal configuration
export const MinimalConfiguration: StoryObj = {
  render: () => {
    const simpleData = [
      { id: 1, name: 'Item 1', value: 100 },
      { id: 2, name: 'Item 2', value: 200 },
      { id: 3, name: 'Item 3', value: 300 }
    ]

    const simpleColumns = [
      createColumnDefs.text('name', 'Nombre'),
      createColumnDefs.text('value', 'Valor')
    ] as unknown as ColumnDef<(typeof simpleData)[number]>[]

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configuración Mínima</h3>
        <p className="text-sm text-muted-foreground">
          Tabla simple sin funcionalidades adicionales para casos básicos.
        </p>
        
        <TableModule
          data={simpleData}
          columns={simpleColumns}
          title="Lista Simple"
          searchable={false}
          paginable={false}
          selectable={false}
          exportable={false}
          filterable={false}
        />
      </div>
    )
  }
}

// Example 5: Custom actions
export const CustomActions: StoryObj = {
  render: () => {
    const data = [
      {
        id: 1,
        name: 'Documento 1',
        type: 'PDF',
        size: '2.5 MB',
        status: 'Activo'
      },
      {
        id: 2,
        name: 'Documento 2',
        type: 'DOCX',
        size: '1.8 MB',
        status: 'Archivado'
      }
    ]

    const columns = [
      createColumnDefs.text('name', 'Nombre del Documento', { searchable: true }),
      createColumnDefs.text('type', 'Tipo'),
      createColumnDefs.text('size', 'Tamaño'),
      createColumnDefs.badge('status', 'Estado', {
        getVariant: (status: unknown) => (String(status) === 'Activo' ? 'default' : 'secondary')
      })
    ] as unknown as ColumnDef<(typeof data)[number]>[]

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Acciones Personalizadas</h3>
        <p className="text-sm text-muted-foreground">
          Define acciones personalizadas para cada fila usando customActions.
        </p>
        
        <TableModule
          data={data}
          columns={columns}
          title="Gestión de Documentos"
          searchColumn="name"
          customActions={(row) => (
            <div className="flex space-x-1">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => toast.info(`Descargando: ${row.name}`)}
              >
                Descargar
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => toast.info(`Compartiendo: ${row.name}`)}
              >
                Compartir
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => toast.error(`Eliminando: ${row.name}`)}
              >
                Eliminar
              </Button>
            </div>
          )}
        />
      </div>
    )
  }
}

// Example 6: All configurations showcase
export const AllConfigurations: StoryObj = {
  render: () => {
    const userData = [
      { id: 1, name: 'Juan Pérez', email: 'juan@test.com', role: 'Admin', status: 'Activo', lastLogin: '2024-01-15', department: 'IT', salary: 5000 },
      { id: 2, name: 'María González', email: 'maria@test.com', role: 'User', status: 'Activo', lastLogin: '2024-01-14', department: 'Sales', salary: 3500 }
    ]
    const userColumns = TableConfigs.users.columns as unknown as ColumnDef<(typeof userData)[number]>[]

    const productData = [
      { id: 1, name: 'Laptop Dell', category: 'Electrónicos', price: 1299.99, stock: 15, status: 'Disponible', createdAt: '2024-01-10' },
      { id: 2, name: 'Mouse Logitech', category: 'Accesorios', price: 99.99, stock: 0, status: 'Agotado', createdAt: '2024-01-08' }
    ]
    const productColumns = TableConfigs.products.columns as unknown as ColumnDef<(typeof productData)[number]>[]

    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Sistema Modular de Tablas</h2>
          <p className="text-muted-foreground mb-6">
            Ejemplos de todas las configuraciones disponibles en el sistema modular de tablas.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">1. Tabla de Usuarios (Pre-configurada)</h3>
          <TableModule
            data={userData}
            columns={userColumns}
            title="Usuarios del Sistema"
            searchColumn={TableConfigs.users.searchColumn}
            defaultPageSize={5}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">2. Tabla de Productos (Pre-configurada)</h3>
          <TableModule
            data={productData}
            columns={productColumns}
            title="Inventario de Productos"
            searchColumn={TableConfigs.products.searchColumn}
            defaultPageSize={5}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">3. Tabla Personalizada</h3>
          <TableModule
            data={
              [
                { customField: 'Valor 1', anotherField: 'Dato A' },
                { customField: 'Valor 2', anotherField: 'Dato B' }
              ] as Array<Record<string, unknown>>
            }
            columns={
              [
                createColumnDefs.text('customField', 'Campo Personalizado'),
                createColumnDefs.text('anotherField', 'Otro Campo')
              ] as unknown as ColumnDef<Record<string, unknown>>[]
            }
            title="Tabla Personalizada"
            searchColumn="customField"
            defaultPageSize={5}
          />
        </div>
      </div>
    )
  }
}
