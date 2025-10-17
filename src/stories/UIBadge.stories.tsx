import type { Meta, StoryObj } from '@storybook/nextjs'
import { Badge } from '../components/ui/badge'
import { ThemeProvider } from '../hooks/use-theme'

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Componente Badge de Shadcn/UI para etiquetas y estados.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div className="p-4">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Badge',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
}

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Activo</Badge>
      <Badge variant="secondary">Inactivo</Badge>
      <Badge variant="destructive">Error</Badge>
      <Badge variant="outline">Pendiente</Badge>
    </div>
  ),
}

export const NotificationBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Nuevo</Badge>
      <Badge variant="secondary">Actualizado</Badge>
      <Badge variant="destructive">Urgente</Badge>
      <Badge variant="outline">Leído</Badge>
    </div>
  ),
}

export const PriorityBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="destructive">Alta Prioridad</Badge>
      <Badge>Media Prioridad</Badge>
      <Badge variant="secondary">Baja Prioridad</Badge>
      <Badge variant="outline">Sin Prioridad</Badge>
    </div>
  ),
}

export const CategoryBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Frontend</Badge>
      <Badge variant="secondary">Backend</Badge>
      <Badge variant="outline">DevOps</Badge>
      <Badge variant="destructive">Bug</Badge>
    </div>
  ),
}

export const UserStatus: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span>Juan Pérez</span>
        <Badge>En línea</Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <span>María García</span>
        <Badge variant="secondary">Ausente</Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <span>Carlos López</span>
        <Badge variant="destructive">Ocupado</Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <span>Ana Martínez</span>
        <Badge variant="outline">Desconectado</Badge>
      </div>
    </div>
  ),
}

export const TaskStatus: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <span>Implementar autenticación</span>
        <Badge>En progreso</Badge>
      </div>
      
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <span>Diseñar interfaz de usuario</span>
        <Badge variant="outline">Pendiente</Badge>
      </div>
      
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <span>Configurar base de datos</span>
        <Badge variant="secondary">Completado</Badge>
      </div>
      
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <span>Resolver bug crítico</span>
        <Badge variant="destructive">Bloqueado</Badge>
      </div>
    </div>
  ),
}

export const ProductTags: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">Producto: iPhone 15</h4>
        <div className="flex flex-wrap gap-2">
          <Badge>Nuevo</Badge>
          <Badge variant="secondary">Electrónicos</Badge>
          <Badge variant="outline">Apple</Badge>
        </div>
      </div>
      
      <div>
        <h4 className="font-medium mb-2">Producto: MacBook Pro</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant="destructive">Oferta</Badge>
          <Badge variant="secondary">Laptops</Badge>
          <Badge variant="outline">Apple</Badge>
        </div>
      </div>
      
      <div>
        <h4 className="font-medium mb-2">Producto: AirPods</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Accesorios</Badge>
          <Badge variant="secondary">Audio</Badge>
          <Badge variant="outline">Apple</Badge>
        </div>
      </div>
    </div>
  ),
}

export const InCards: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Proyecto Alpha</h4>
          <Badge>Activo</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Desarrollo de nueva funcionalidad
        </p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs">React</Badge>
          <Badge variant="secondary" className="text-xs">TypeScript</Badge>
          <Badge variant="secondary" className="text-xs">UI/UX</Badge>
        </div>
      </div>
      
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Proyecto Beta</h4>
          <Badge variant="outline">Pausado</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Optimización de rendimiento
        </p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="destructive" className="text-xs">Crítico</Badge>
          <Badge variant="secondary" className="text-xs">Performance</Badge>
          <Badge variant="secondary" className="text-xs">Backend</Badge>
        </div>
      </div>
    </div>
  ),
}
