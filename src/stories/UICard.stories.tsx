import type { Meta, StoryObj } from '@storybook/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { ThemeProvider } from '../hooks/use-theme'
import { Star, Heart, Share2, Download } from 'lucide-react'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Componente Card de Shadcn/UI para contenedores de contenido.',
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
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Título de la tarjeta</CardTitle>
        <CardDescription>Descripción de la tarjeta</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Contenido de la tarjeta</p>
      </CardContent>
    </Card>
  ),
}

export const Simple: Story = {
  render: () => (
    <Card>
      <CardContent className="p-6">
        <p>Tarjeta simple con solo contenido</p>
      </CardContent>
    </Card>
  ),
}

export const WithActions: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Tarjeta con acciones</CardTitle>
        <CardDescription>Esta tarjeta incluye botones de acción</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Contenido de la tarjeta con acciones disponibles.</p>
      </CardContent>
      <CardContent className="flex gap-2">
        <Button size="sm">
          <Download />
          Descargar
        </Button>
        <Button variant="outline" size="sm">
          <Share2 />
          Compartir
        </Button>
        <Button variant="ghost" size="sm">
          <Heart />
          Favorito
        </Button>
      </CardContent>
    </Card>
  ),
}

export const ProductCard: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="secondary">Nuevo</Badge>
          <Button variant="ghost" size="sm">
            <Heart />
          </Button>
        </div>
        <CardTitle>Producto Ejemplo</CardTitle>
        <CardDescription>
          Descripción breve del producto que se está mostrando
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="text-sm text-muted-foreground">(4.8)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">$99.99</span>
            <Button>Añadir al carrito</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
}

export const UserProfile: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader className="text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-2xl">👤</span>
        </div>
        <CardTitle>Juan Pérez</CardTitle>
        <CardDescription>Desarrollador Frontend</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Ubicación</p>
            <p>Bogotá, Colombia</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Experiencia</p>
            <p>5+ años en desarrollo web</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              Seguir
            </Button>
            <Button size="sm" className="flex-1">
              Contactar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
}

export const Statistics: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$45,231</div>
          <p className="text-xs text-muted-foreground">
            +20.1% desde el mes pasado
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">2,350</div>
          <p className="text-xs text-muted-foreground">
            +180.1% desde el mes pasado
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">12,234</div>
          <p className="text-xs text-muted-foreground">
            +19% desde el mes pasado
          </p>
        </CardContent>
      </Card>
    </div>
  ),
}

export const FeatureCard: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
          <Star className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Característica Destacada</CardTitle>
        <CardDescription>
          Descripción de la característica principal que ofrece esta funcionalidad
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
            Beneficio número uno
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
            Beneficio número dos
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
            Beneficio número tres
          </li>
        </ul>
        <Button className="w-full mt-4">
          Aprender más
        </Button>
      </CardContent>
    </Card>
  ),
}

export const AllCards: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tarjeta Simple</CardTitle>
          <CardDescription>Descripción básica</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Contenido de ejemplo</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Con Acciones</CardTitle>
          <CardDescription>Incluye botones</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Contenido con acciones</p>
          <div className="flex gap-2 mt-4">
            <Button size="sm">Acción 1</Button>
            <Button variant="outline" size="sm">Acción 2</Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Estadística</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">1,234</div>
          <p className="text-sm text-muted-foreground">+12% este mes</p>
        </CardContent>
      </Card>
    </div>
  ),
}
