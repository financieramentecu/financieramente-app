# Sistema Modular de Tablas - Financieramente

## 🎯 Descripción

El sistema modular de tablas está diseñado para proporcionar una solución escalable y reutilizable para mostrar datos tabulares en la aplicación Financieramente. Está construido sobre **TanStack Table** y sigue las mejores prácticas de **Shadcn/UI**.

## 🏗️ Arquitectura

### Componentes Principales

1. **`DataTable`** - Componente base con TanStack Table
2. **`TableModule`** - Wrapper modular y configurable
3. **`TableConfigs`** - Configuraciones predefinidas
4. **`createColumnDefs`** - Utilidades para crear columnas

### Flujo de Datos

```
TableModule → DataTable → TanStack Table → UI Components
```

## 🚀 Uso Básico

### 1. Configuración Predefinida

```tsx
import { TableModule, TableConfigs } from '@/components/ui/table-module'

const usersData = [
	{
		id: 1,
		name: 'Juan Pérez',
		email: 'juan@financieramente.com',
		role: 'Administrador',
		status: 'Activo',
		lastLogin: '2024-01-15',
		department: 'IT',
		salary: 5000,
	},
	// ... más datos
]

function UsersPage() {
	return (
		<TableModule
			data={usersData}
			columns={TableConfigs.users.columns}
			title="Gestión de Usuarios"
			description="Administra los usuarios del sistema"
			searchColumn={TableConfigs.users.searchColumn}
			defaultPageSize={TableConfigs.users.defaultPageSize}
			onRowClick={(row) => console.log('Usuario seleccionado:', row)}
			onEdit={(row) => console.log('Editando:', row)}
			onDelete={(row) => console.log('Eliminando:', row)}
		/>
	)
}
```

### 2. Configuración Personalizada

```tsx
import { TableModule, createColumnDefs } from '@/components/ui/table-module'

const customColumns = [
	createColumnDefs.text('name', 'Nombre Completo', { searchable: true }),
	createColumnDefs.text('email', 'Correo Electrónico', { searchable: true }),
	createColumnDefs.badge('role', 'Tipo de Usuario', {
		getVariant: (role: string) => {
			switch (role) {
				case 'Administrador':
					return 'default'
				case 'Supervisor':
					return 'secondary'
				default:
					return 'outline'
			}
		},
	}),
	createColumnDefs.currency('salary', 'Salario Mensual', { currency: 'USD' }),
	createColumnDefs.date('lastLogin', 'Último Acceso'),
]

function CustomTable() {
	return (
		<TableModule
			data={data}
			columns={customColumns}
			title="Tabla Personalizada"
			searchColumn="name"
			onRowClick={(row) => console.log('Fila clickeada:', row)}
		/>
	)
}
```

## 📋 Configuraciones Predefinidas

### Usuarios (`TableConfigs.users`)

```tsx
{
  columns: [
    createColumnDefs.text('name', 'Nombre', { searchable: true }),
    createColumnDefs.text('email', 'Email', { searchable: true }),
    createColumnDefs.badge('role', 'Rol', { /* variant logic */ }),
    createColumnDefs.badge('status', 'Estado', { /* variant logic */ }),
    createColumnDefs.text('department', 'Departamento'),
    createColumnDefs.date('lastLogin', 'Último Acceso'),
    createColumnDefs.currency('salary', 'Salario', { currency: 'USD' }),
  ],
  searchColumn: 'name',
  defaultPageSize: 10,
}
```

### Productos (`TableConfigs.products`)

```tsx
{
  columns: [
    createColumnDefs.text('name', 'Producto', { searchable: true }),
    createColumnDefs.text('category', 'Categoría'),
    createColumnDefs.currency('price', 'Precio', { currency: 'USD' }),
    createColumnDefs.text('stock', 'Stock'),
    createColumnDefs.badge('status', 'Estado', { /* variant logic */ }),
    createColumnDefs.date('createdAt', 'Fecha Creación'),
  ],
  searchColumn: 'name',
  defaultPageSize: 15,
}
```

### Pedidos (`TableConfigs.orders`)

```tsx
{
  columns: [
    createColumnDefs.text('id', 'ID Pedido'),
    createColumnDefs.text('customer', 'Cliente', { searchable: true }),
    createColumnDefs.currency('total', 'Total', { currency: 'USD' }),
    createColumnDefs.badge('status', 'Estado', { /* variant logic */ }),
    createColumnDefs.date('orderDate', 'Fecha Pedido'),
    createColumnDefs.date('deliveryDate', 'Fecha Entrega'),
  ],
  searchColumn: 'customer',
  defaultPageSize: 20,
}
```

## 🔧 Utilidades de Columnas

### `createColumnDefs.text()`

```tsx
createColumnDefs.text('fieldName', 'Título de Columna', {
	sortable: true, // Habilitar ordenamiento
	searchable: true, // Habilitar búsqueda
	width: '200px', // Ancho fijo
	align: 'center', // Alineación: 'left' | 'center' | 'right'
})
```

### `createColumnDefs.badge()`

```tsx
createColumnDefs.badge('status', 'Estado', {
	variant: 'default', // Variante fija
	getVariant: (value) => {
		// Función para variante dinámica
		switch (value) {
			case 'Activo':
				return 'default'
			case 'Inactivo':
				return 'destructive'
			default:
				return 'outline'
		}
	},
})
```

### `createColumnDefs.currency()`

```tsx
createColumnDefs.currency('price', 'Precio', {
	currency: 'USD', // Código de moneda
	locale: 'es-ES', // Locale para formato
})
```

### `createColumnDefs.date()`

```tsx
createColumnDefs.date('createdAt', 'Fecha de Creación', {
	format: 'short', // Formato de fecha
})
```

### `createColumnDefs.actions()`

```tsx
createColumnDefs.actions((row) => (
	<div className="flex space-x-1">
		<Button size="sm" onClick={() => editRow(row)}>
			Editar
		</Button>
		<Button size="sm" variant="destructive" onClick={() => deleteRow(row)}>
			Eliminar
		</Button>
	</div>
))
```

## 🎛️ Props del TableModule

### Props Principales

| Prop          | Tipo          | Default | Descripción                 |
| ------------- | ------------- | ------- | --------------------------- |
| `data`        | `TData[]`     | -       | Array de datos para mostrar |
| `columns`     | `ColumnDef[]` | -       | Configuración de columnas   |
| `title`       | `string`      | -       | Título de la tabla          |
| `description` | `string`      | -       | Descripción de la tabla     |

### Props de Funcionalidad

| Prop           | Tipo      | Default | Descripción                      |
| -------------- | --------- | ------- | -------------------------------- |
| `searchable`   | `boolean` | `true`  | Habilitar búsqueda               |
| `searchColumn` | `string`  | -       | Columna específica para búsqueda |
| `paginable`    | `boolean` | `true`  | Habilitar paginación             |
| `selectable`   | `boolean` | `true`  | Habilitar selección múltiple     |
| `exportable`   | `boolean` | `true`  | Habilitar exportación            |
| `filterable`   | `boolean` | `true`  | Habilitar filtros de columnas    |

### Props de Configuración

| Prop              | Tipo       | Default                      | Descripción                  |
| ----------------- | ---------- | ---------------------------- | ---------------------------- |
| `pageSizeOptions` | `number[]` | `[10, 20, 30, 40, 50]`       | Opciones de tamaño de página |
| `defaultPageSize` | `number`   | `10`                         | Tamaño de página por defecto |
| `loading`         | `boolean`  | `false`                      | Estado de carga              |
| `emptyMessage`    | `string`   | `"No hay datos disponibles"` | Mensaje cuando no hay datos  |

### Props de Eventos

| Prop                | Tipo                              | Descripción                          |
| ------------------- | --------------------------------- | ------------------------------------ |
| `onRowClick`        | `(row: TData) => void`            | Callback al hacer clic en una fila   |
| `onSelectionChange` | `(selectedRows: TData[]) => void` | Callback al cambiar selección        |
| `onExport`          | `(data: TData[]) => void`         | Callback al exportar datos           |
| `onEdit`            | `(row: TData) => void`            | Callback al editar una fila          |
| `onDelete`          | `(row: TData) => void`            | Callback al eliminar una fila        |
| `onView`            | `(row: TData) => void`            | Callback al ver detalles de una fila |

## 🎨 Personalización

### Acciones Personalizadas

```tsx
<TableModule
	data={data}
	columns={columns}
	customActions={(row) => (
		<div className="flex space-x-1">
			<Button size="sm" variant="outline" onClick={() => viewDetails(row)}>
				Ver
			</Button>
			<Button size="sm" variant="outline" onClick={() => editRow(row)}>
				Editar
			</Button>
			<Button size="sm" variant="destructive" onClick={() => deleteRow(row)}>
				Eliminar
			</Button>
		</div>
	)}
/>
```

### Estilos Personalizados

```tsx
<TableModule
	data={data}
	columns={columns}
	className="custom-table-class"
	// ... otras props
/>
```

## 🔄 Hook useTableModule

```tsx
import { useTableModule } from '@/components/ui/table-module'

function MyComponent() {
	const { createTable } = useTableModule()

	const MyTable = createTable({
		data: myData,
		columns: myColumns,
		title: 'Mi Tabla',
		searchColumn: 'name',
	})

	return (
		<MyTable
			onRowClick={(row) => console.log('Clicked:', row)}
			onEdit={(row) => console.log('Edit:', row)}
		/>
	)
}
```

## 📊 Casos de Uso Comunes

### 1. Tabla de Usuarios con CRUD

```tsx
function UsersTable() {
	const [users, setUsers] = useState(initialUsers)

	const handleEdit = (user) => {
		// Abrir modal de edición
		setEditingUser(user)
	}

	const handleDelete = (user) => {
		// Confirmar eliminación
		if (confirm(`¿Eliminar usuario ${user.name}?`)) {
			setUsers(users.filter((u) => u.id !== user.id))
		}
	}

	return (
		<TableModule
			data={users}
			columns={TableConfigs.users.columns}
			title="Usuarios del Sistema"
			onEdit={handleEdit}
			onDelete={handleDelete}
			onRowClick={(user) => navigate(`/users/${user.id}`)}
		/>
	)
}
```

### 2. Tabla de Productos con Filtros

```tsx
function ProductsTable() {
	const [products, setProducts] = useState(initialProducts)
	const [filteredProducts, setFilteredProducts] = useState(products)

	const handleSearch = (query) => {
		const filtered = products.filter((product) =>
			product.name.toLowerCase().includes(query.toLowerCase())
		)
		setFilteredProducts(filtered)
	}

	return (
		<TableModule
			data={filteredProducts}
			columns={TableConfigs.products.columns}
			title="Inventario de Productos"
			searchColumn="name"
			onExport={(data) => exportToCSV(data, 'productos.csv')}
		/>
	)
}
```

### 3. Tabla Mínima para Listas Simples

```tsx
function SimpleList() {
	return (
		<TableModule
			data={simpleData}
			columns={[
				createColumnDefs.text('name', 'Nombre'),
				createColumnDefs.text('value', 'Valor'),
			]}
			title="Lista Simple"
			searchable={false}
			paginable={false}
			selectable={false}
			exportable={false}
			filterable={false}
		/>
	)
}
```

## 🧪 Testing

### Tests Unitarios

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { TableModule, TableConfigs } from '@/components/ui/table-module'

test('renders table with data', () => {
	const data = [{ id: 1, name: 'Test User', email: 'test@example.com' }]

	render(
		<TableModule
			data={data}
			columns={TableConfigs.users.columns}
			title="Test Table"
		/>
	)

	expect(screen.getByText('Test Table')).toBeInTheDocument()
	expect(screen.getByText('Test User')).toBeInTheDocument()
})

test('handles row click', () => {
	const mockOnRowClick = jest.fn()
	const data = [{ id: 1, name: 'Test User' }]

	render(
		<TableModule
			data={data}
			columns={TableConfigs.users.columns}
			onRowClick={mockOnRowClick}
		/>
	)

	fireEvent.click(screen.getByText('Test User'))
	expect(mockOnRowClick).toHaveBeenCalledWith(data[0])
})
```

## 🚀 Mejores Prácticas

### 1. Usar Configuraciones Predefinidas

```tsx
// ✅ Bueno
<TableModule
  data={users}
  columns={TableConfigs.users.columns}
  searchColumn={TableConfigs.users.searchColumn}
/>

// ❌ Evitar
<TableModule
  data={users}
  columns={[
    createColumnDefs.text('name', 'Nombre'),
    createColumnDefs.text('email', 'Email'),
    // ... repetir configuración
  ]}
/>
```

### 2. Memoizar Datos Pesados

```tsx
const memoizedColumns = useMemo(
	() => [
		createColumnDefs.text('name', 'Nombre'),
		createColumnDefs.text('email', 'Email'),
	],
	[]
)

const memoizedData = useMemo(() => expensiveDataProcessing(rawData), [rawData])
```

### 3. Manejar Estados de Carga

```tsx
<TableModule
	data={data}
	columns={columns}
	loading={isLoading}
	emptyMessage={error ? 'Error al cargar datos' : 'No hay datos disponibles'}
/>
```

### 4. Optimizar Rendimiento

```tsx
// Para datasets grandes, usar paginación del servidor
<TableModule
	data={data}
	columns={columns}
	paginable={true}
	defaultPageSize={20}
	onPageChange={(page, size) => {
		// Cargar datos del servidor
		fetchData(page, size)
	}}
/>
```

## 🔧 Troubleshooting

### Problemas Comunes

1. **Columnas no se renderizan**
   - Verificar que `columns` sea un array válido
   - Asegurar que `data` tenga las propiedades esperadas

2. **Búsqueda no funciona**
   - Verificar que `searchColumn` coincida con una columna existente
   - Asegurar que `searchable={true}` esté configurado

3. **Paginación no funciona**
   - Verificar que `paginable={true}` esté configurado
   - Asegurar que `data` tenga más elementos que `defaultPageSize`

4. **Acciones no aparecen**
   - Verificar que se hayan pasado `onEdit`, `onDelete`, etc.
   - O usar `customActions` para acciones personalizadas

## 📚 Recursos Adicionales

- [TanStack Table Documentation](https://tanstack.com/table/latest)
- [Shadcn/UI Table Component](https://ui.shadcn.com/docs/components/table)
- [Storybook Stories](./UITableModule.stories.tsx)
- [Ejemplos de Uso](./TableModuleUsage.stories.tsx)

---

_Última actualización: Enero 2024_
_Versión: 1.0.0_
