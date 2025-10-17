import type { Meta, StoryObj } from '@storybook/nextjs'
import { Label } from '../components/ui/label'
import { ThemeProvider } from '../hooks/use-theme'

const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Componente Label de Shadcn/UI para etiquetas de formularios.',
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
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Etiqueta básica',
  },
}

export const WithHtmlFor: Story = {
  args: {
    htmlFor: 'input-example',
    children: 'Etiqueta con htmlFor',
  },
}

export const Required: Story = {
  render: () => (
    <Label htmlFor="required-input">
      Campo requerido <span className="text-destructive">*</span>
    </Label>
  ),
}

export const Optional: Story = {
  render: () => (
    <Label htmlFor="optional-input">
      Campo opcional <span className="text-muted-foreground">(opcional)</span>
    </Label>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <div className="space-y-1">
      <Label htmlFor="description-input">Correo electrónico</Label>
      <p className="text-sm text-muted-foreground">
        Ingresa tu correo electrónico principal
      </p>
    </div>
  ),
}

export const FormLabels: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Nombre completo</Label>
        <p className="text-sm text-muted-foreground">
          Tu nombre completo como aparece en documentos oficiales
        </p>
      </div>
      
      <div className="space-y-1">
        <Label htmlFor="email">
          Correo electrónico <span className="text-destructive">*</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          Usaremos este correo para comunicarnos contigo
        </p>
      </div>
      
      <div className="space-y-1">
        <Label htmlFor="phone">
          Teléfono <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          Número de contacto en caso de emergencia
        </p>
      </div>
      
      <div className="space-y-1">
        <Label htmlFor="bio">Biografía</Label>
        <p className="text-sm text-muted-foreground">
          Cuéntanos un poco sobre ti
        </p>
      </div>
    </div>
  ),
}

export const AllLabelTypes: Story = {
  render: () => (
    <div className="space-y-4">
      <Label>Etiqueta simple</Label>
      
      <Label htmlFor="input1">Etiqueta con htmlFor</Label>
      
      <Label htmlFor="input2">
        Campo requerido <span className="text-destructive">*</span>
      </Label>
      
      <Label htmlFor="input3">
        Campo opcional <span className="text-muted-foreground">(opcional)</span>
      </Label>
      
      <div className="space-y-1">
        <Label htmlFor="input4">Etiqueta con descripción</Label>
        <p className="text-sm text-muted-foreground">
          Esta es una descripción adicional para el campo
        </p>
      </div>
    </div>
  ),
}

export const InFormContext: Story = {
  render: () => (
    <div className="space-y-6 p-6 border rounded-lg">
      <h3 className="text-lg font-semibold">Formulario de Registro</h3>
      
      <div className="space-y-2">
        <Label htmlFor="form-name">
          Nombre completo <span className="text-destructive">*</span>
        </Label>
        <input
          id="form-name"
          type="text"
          className="w-full px-3 py-2 border border-input bg-background rounded-md"
          placeholder="Tu nombre completo"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="form-email">
          Correo electrónico <span className="text-destructive">*</span>
        </Label>
        <input
          id="form-email"
          type="email"
          className="w-full px-3 py-2 border border-input bg-background rounded-md"
          placeholder="tu@email.com"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="form-phone">
          Teléfono <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <input
          id="form-phone"
          type="tel"
          className="w-full px-3 py-2 border border-input bg-background rounded-md"
          placeholder="+57 300 123 4567"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="form-bio">Biografía</Label>
        <textarea
          id="form-bio"
          className="w-full px-3 py-2 border border-input bg-background rounded-md"
          placeholder="Cuéntanos sobre ti..."
          rows={3}
        />
      </div>
      
      <div className="flex gap-3">
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
