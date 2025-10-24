import type { Meta, StoryObj } from '@storybook/nextjs'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { ThemeProvider } from '../hooks/use-theme'
// Icons are used in stories but not directly imported

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Componente Input de Shadcn/UI para campos de entrada de texto.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div className="w-80 p-4">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Ingresa tu texto...',
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="input">Nombre completo</Label>
      <Input id="input" placeholder="Tu nombre completo" />
    </div>
  ),
}

export const Email: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="email">Correo electrónico</Label>
      <Input id="email" type="email" placeholder="tu@email.com" />
    </div>
  ),
}

export const Password: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="password">Contraseña</Label>
      <Input id="password" type="password" placeholder="••••••••" />
    </div>
  ),
}

export const SearchInput: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="search">Buscar</Label>
      <Input id="search" type="search" placeholder="Buscar productos..." />
    </div>
  ),
}

export const NumberInput: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="number">Cantidad</Label>
      <Input id="number" type="number" placeholder="0" />
    </div>
  ),
}

export const PhoneInput: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="phone">Teléfono</Label>
      <Input id="phone" type="tel" placeholder="+57 300 123 4567" />
    </div>
  ),
}

export const DateInput: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="date">Fecha de nacimiento</Label>
      <Input id="date" type="date" />
    </div>
  ),
}

export const TimeInput: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="time">Hora de cita</Label>
      <Input id="time" type="time" />
    </div>
  ),
}

export const URLInput: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="url">Sitio web</Label>
      <Input id="url" type="url" placeholder="https://ejemplo.com" />
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Campo deshabilitado',
  },
}

export const WithValue: Story = {
  args: {
    value: 'Texto prellenado',
    readOnly: true,
  },
}

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="text">Texto</Label>
        <Input id="text" type="text" placeholder="Texto normal" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email2">Email</Label>
        <Input id="email2" type="email" placeholder="email@ejemplo.com" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password2">Contraseña</Label>
        <Input id="password2" type="password" placeholder="••••••••" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="search2">Búsqueda</Label>
        <Input id="search2" type="search" placeholder="Buscar..." />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="number2">Número</Label>
        <Input id="number2" type="number" placeholder="123" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="tel2">Teléfono</Label>
        <Input id="tel2" type="tel" placeholder="+57 300 123 4567" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="url2">URL</Label>
        <Input id="url2" type="url" placeholder="https://ejemplo.com" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="date2">Fecha</Label>
        <Input id="date2" type="date" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="time2">Hora</Label>
        <Input id="time2" type="time" />
      </div>
    </div>
  ),
}

export const FormExample: Story = {
  render: () => (
    <div className="space-y-4 p-6 border rounded-lg">
      <h3 className="text-lg font-semibold">Formulario de Registro</h3>
      
      <div className="space-y-2">
        <Label htmlFor="name">Nombre completo</Label>
        <Input id="name" type="text" placeholder="Tu nombre completo" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email-form">Correo electrónico</Label>
        <Input id="email-form" type="email" placeholder="tu@email.com" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone-form">Teléfono</Label>
        <Input id="phone-form" type="tel" placeholder="+57 300 123 4567" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password-form">Contraseña</Label>
        <Input id="password-form" type="password" placeholder="Mínimo 8 caracteres" />
      </div>
      
      <div className="flex gap-3 pt-4">
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Registrarse
        </button>
        <button className="px-4 py-2 border border-input bg-background rounded-md hover:bg-accent">
          Cancelar
        </button>
      </div>
    </div>
  ),
}
