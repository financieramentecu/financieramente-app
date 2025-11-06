import type { Meta, StoryObj } from '@storybook/nextjs'

// Componente simplificado para evitar bucles infinitos
const SimpleMisNegociosPage = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Mis Negocios</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg bg-card">
          <h3 className="text-lg font-semibold">Total Negocios</h3>
          <p className="text-2xl font-bold text-primary">156</p>
          <p className="text-sm text-muted-foreground">+12% desde el mes pasado</p>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <h3 className="text-lg font-semibold">Valor Total</h3>
          <p className="text-2xl font-bold text-primary">$2.845B</p>
          <p className="text-sm text-muted-foreground">-3% desde el mes pasado</p>
        </div>
      </div>

      {/* Search Section */}
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="text-lg font-semibold mb-4">Búsqueda de Negocios</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de búsqueda</label>
            <select className="w-full p-2 border rounded-md">
              <option>Nombre del agente</option>
              <option>Cliente</option>
              <option>Cédula</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Criterio de búsqueda</label>
            <input 
              type="text" 
              placeholder="Ingrese el criterio de búsqueda..." 
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              Buscar
            </button>
            <button className="px-4 py-2 border rounded-md hover:bg-accent">
              Mostrar todos
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="p-4 border rounded-lg bg-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Lista de Negocios</h3>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Agregar negocio
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Identificación</th>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Plazo</th>
                <th className="p-2 text-left">Valor</th>
                <th className="p-2 text-left">Estado</th>
                <th className="p-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2">CC 12345678</td>
                <td className="p-2">María García</td>
                <td className="p-2">maria.garcia@email.com</td>
                <td className="p-2">12 meses</td>
                <td className="p-2">$15,000,000</td>
                <td className="p-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
                    Emitido
                  </span>
                </td>
                <td className="p-2">
                  <button className="px-2 py-1 border rounded hover:bg-accent">
                    Editar
                  </button>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-2">CC 87654321</td>
                <td className="p-2">Carlos López</td>
                <td className="p-2">carlos.lopez@email.com</td>
                <td className="p-2">24 meses</td>
                <td className="p-2">$25,000,000</td>
                <td className="p-2">
                  <span className="px-2 py-1 bg-secondary/10 text-secondary-foreground rounded-full text-sm">
                    Venta Efectuado
                  </span>
                </td>
                <td className="p-2">
                  <button className="px-2 py-1 border rounded hover:bg-accent">
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const meta: Meta<typeof SimpleMisNegociosPage> = {
  title: 'Pages/MisNegociosPage',
  component: SimpleMisNegociosPage,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Página simplificada de Mis Negocios para evitar bucles infinitos.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const EmptyState: Story = {
  render: () => (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Mis Negocios</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg bg-card">
          <h3 className="text-lg font-semibold">Total Negocios</h3>
          <p className="text-2xl font-bold text-primary">0</p>
          <p className="text-sm text-muted-foreground">No hay negocios registrados</p>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <h3 className="text-lg font-semibold">Valor Total</h3>
          <p className="text-2xl font-bold text-primary">$0</p>
          <p className="text-sm text-muted-foreground">Sin valor acumulado</p>
        </div>
      </div>

      {/* Empty Table */}
      <div className="p-4 border rounded-lg bg-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Lista de Negocios</h3>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Agregar negocio
          </button>
        </div>
        
        <div className="text-center py-8">
          <p className="text-muted-foreground">No se encontraron negocios</p>
        </div>
      </div>
    </div>
  )
}
