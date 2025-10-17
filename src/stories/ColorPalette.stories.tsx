import type { Meta, StoryObj } from '@storybook/nextjs'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { ThemeProvider } from '../hooks/use-theme'

const ColorPaletteDemo = () => {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Paleta de Colores Financieramente</h2>
        <p className="text-muted-foreground mb-6">
          Colores corporativos implementados en el sistema de temas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Color Primario</CardTitle>
            <CardDescription>#00505C - Verde azulado corporativo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-20 bg-primary rounded-md mb-4"></div>
            <Button className="w-full">Botón Primario</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-secondary-foreground">Color Secundario</CardTitle>
            <CardDescription>#83D874 - Verde claro vibrante</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-20 bg-secondary rounded-md mb-4"></div>
            <Button variant="secondary" className="w-full">Botón Secundario</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Colores de Estado</CardTitle>
            <CardDescription>Estados y feedback visual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Variantes de Botones</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Tamaños de Botones</h3>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">📧</Button>
        </div>
      </div>
    </div>
  )
}

const meta: Meta<typeof ColorPaletteDemo> = {
  title: 'Design System/Color Palette',
  component: ColorPaletteDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Paleta completa de colores del sistema Financieramente con ejemplos de uso.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <Story />
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const LightTheme: Story = {
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light">
        <Story />
      </ThemeProvider>
    ),
  ],
}

export const DarkTheme: Story = {
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="dark">
        <Story />
      </ThemeProvider>
    ),
  ],
}
