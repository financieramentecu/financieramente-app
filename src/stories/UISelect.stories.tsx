import type { Meta, StoryObj } from '@storybook/nextjs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Label } from '../components/ui/label'
import { ThemeProvider } from '../hooks/use-theme'

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Componente Select de Shadcn/UI para selección de opciones.',
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
  render: () => (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Selecciona una opción" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Opción 1</SelectItem>
        <SelectItem value="option2">Opción 2</SelectItem>
        <SelectItem value="option3">Opción 3</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="select">País de residencia</Label>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona tu país" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="col">Colombia</SelectItem>
          <SelectItem value="mex">México</SelectItem>
          <SelectItem value="arg">Argentina</SelectItem>
          <SelectItem value="chi">Chile</SelectItem>
          <SelectItem value="per">Perú</SelectItem>
          <SelectItem value="bra">Brasil</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const Countries: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="country">País</Label>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona tu país" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="col">🇨🇴 Colombia</SelectItem>
          <SelectItem value="mex">🇲🇽 México</SelectItem>
          <SelectItem value="arg">🇦🇷 Argentina</SelectItem>
          <SelectItem value="chi">🇨🇱 Chile</SelectItem>
          <SelectItem value="per">🇵🇪 Perú</SelectItem>
          <SelectItem value="bra">🇧🇷 Brasil</SelectItem>
          <SelectItem value="usa">🇺🇸 Estados Unidos</SelectItem>
          <SelectItem value="can">🇨🇦 Canadá</SelectItem>
          <SelectItem value="esp">🇪🇸 España</SelectItem>
          <SelectItem value="fra">🇫🇷 Francia</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const DocumentType: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="document">Tipo de documento</Label>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona el tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cc">Cédula de Ciudadanía</SelectItem>
          <SelectItem value="ce">Cédula de Extranjería</SelectItem>
          <SelectItem value="pas">Pasaporte</SelectItem>
          <SelectItem value="ti">Tarjeta de Identidad</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const Gender: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="gender">Género</Label>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona una opción" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="m">Masculino</SelectItem>
          <SelectItem value="f">Femenino</SelectItem>
          <SelectItem value="o">Otro</SelectItem>
          <SelectItem value="na">Prefiero no decir</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const MaritalStatus: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="marital">Estado civil</Label>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona tu estado civil" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="soltero">Soltero(a)</SelectItem>
          <SelectItem value="casado">Casado(a)</SelectItem>
          <SelectItem value="divorciado">Divorciado(a)</SelectItem>
          <SelectItem value="viudo">Viudo(a)</SelectItem>
          <SelectItem value="union-libre">Unión libre</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const EducationLevel: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="education">Nivel educativo</Label>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona tu nivel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="primaria">Primaria</SelectItem>
          <SelectItem value="secundaria">Secundaria</SelectItem>
          <SelectItem value="tecnico">Técnico</SelectItem>
          <SelectItem value="tecnologo">Tecnólogo</SelectItem>
          <SelectItem value="universitario">Universitario</SelectItem>
          <SelectItem value="postgrado">Postgrado</SelectItem>
          <SelectItem value="maestria">Maestría</SelectItem>
          <SelectItem value="doctorado">Doctorado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="disabled">Opción deshabilitada</Label>
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="No disponible" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Opción 1</SelectItem>
          <SelectItem value="option2">Opción 2</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const WithDisabledOptions: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="plan">Plan</Label>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona un plan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="free">Plan Gratuito</SelectItem>
          <SelectItem value="basic">Plan Básico</SelectItem>
          <SelectItem value="premium" disabled>Plan Premium (Próximamente)</SelectItem>
          <SelectItem value="enterprise" disabled>Plan Empresarial (Próximamente)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const AllSelects: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="select1">País</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona tu país" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="col">Colombia</SelectItem>
            <SelectItem value="mex">México</SelectItem>
            <SelectItem value="arg">Argentina</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="select2">Tipo de documento</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona el tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cc">Cédula de Ciudadanía</SelectItem>
            <SelectItem value="ce">Cédula de Extranjería</SelectItem>
            <SelectItem value="pas">Pasaporte</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="select3">Género</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una opción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="m">Masculino</SelectItem>
            <SelectItem value="f">Femenino</SelectItem>
            <SelectItem value="o">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
}

export const FormExample: Story = {
  render: () => (
    <div className="space-y-4 p-6 border rounded-lg">
      <h3 className="text-lg font-semibold">Información Personal</h3>
      
      <div className="space-y-2">
        <Label htmlFor="country-form">País de residencia</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona tu país" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="col">🇨🇴 Colombia</SelectItem>
            <SelectItem value="mex">🇲🇽 México</SelectItem>
            <SelectItem value="arg">🇦🇷 Argentina</SelectItem>
            <SelectItem value="chi">🇨🇱 Chile</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="document-form">Tipo de documento</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona el tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cc">Cédula de Ciudadanía</SelectItem>
            <SelectItem value="ce">Cédula de Extranjería</SelectItem>
            <SelectItem value="pas">Pasaporte</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="education-form">Nivel educativo</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona tu nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="secundaria">Secundaria</SelectItem>
            <SelectItem value="tecnico">Técnico</SelectItem>
            <SelectItem value="universitario">Universitario</SelectItem>
            <SelectItem value="postgrado">Postgrado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
}
