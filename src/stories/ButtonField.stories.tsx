import type { Meta, StoryObj } from '@storybook/nextjs'
import { Button } from '../components/ui/button'
import { ThemeProvider } from '../hooks/use-theme'
import { Save, Download, Trash2, Plus, Edit, Search as SearchIcon } from 'lucide-react'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Componente Button de Shadcn/UI con todas las variantes y tamaños disponibles.',
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
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Variantes básicas
export const Default: Story = {
  args: {
    children: 'Button',
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

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
}

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
  },
}

// Tamaños
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
}

export const Icon: Story = {
  args: {
    size: 'icon',
    children: <Plus />,
  },
}

// Con iconos
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Save />
        Save
      </>
    ),
  },
}

export const IconOnly: Story = {
  args: {
    size: 'icon',
    children: <SearchIcon />,
  },
}

// Estados
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
}

// Todas las variantes
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
}

// Todos los tamaños
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <Plus />
      </Button>
    </div>
  ),
}

// Botones con iconos
export const ButtonsWithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button>
        <Save />
        Save
      </Button>
      <Button variant="outline">
        <Download />
        Download
      </Button>
      <Button variant="destructive">
        <Trash2 />
        Delete
      </Button>
      <Button variant="secondary">
        <Edit />
        Edit
      </Button>
      <Button variant="ghost">
        <SearchIcon />
        Search
      </Button>
      <Button variant="link">
        <Plus />
        Add
      </Button>
    </div>
  ),
}

// Botones de acción
export const ActionButtons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">
        <Save />
        Save Changes
      </Button>
      <Button variant="outline">
        <Download />
        Export Data
      </Button>
      <Button variant="secondary">
        <Edit />
        Edit Profile
      </Button>
      <Button variant="destructive">
        <Trash2 />
        Delete Account
      </Button>
    </div>
  ),
}

// Estados de loading (simulado)
export const LoadingStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button disabled>
        <Save />
        Saving...
      </Button>
      <Button variant="outline" disabled>
        <Download />
        Downloading...
      </Button>
      <Button variant="secondary" disabled>
        Processing...
      </Button>
    </div>
  ),
}

// Botones en diferentes contextos
export const InContext: Story = {
  render: () => (
    <div className="space-y-6 p-6 border rounded-lg">
      <div>
        <h3 className="text-lg font-semibold mb-4">Formulario de Usuario</h3>
        <div className="flex gap-3">
          <Button>
            <Save />
            Guardar
          </Button>
          <Button variant="outline">
            Cancelar
          </Button>
          <Button variant="destructive">
            <Trash2 />
            Eliminar
          </Button>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
        <div className="flex gap-2">
          <Button size="icon" variant="outline">
            <Plus />
          </Button>
          <Button size="icon" variant="outline">
            <Edit />
          </Button>
          <Button size="icon" variant="outline">
            <SearchIcon />
          </Button>
        </div>
      </div>
    </div>
  ),
}
