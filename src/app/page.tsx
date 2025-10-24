import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">Financieramente</h1>
            <p className="text-muted-foreground">Plataforma de Liquidación de Comisiones</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <h2 className="text-4xl font-bold">Sistema de Temas Implementado</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Plataforma con sistema completo de temas de color usando Shadcn/UI y Tailwind CSS, 
            con soporte para modo claro y oscuro.
          </p>
        </section>

        <Separator />

        {/* Color Palette Demo */}
        <section className="space-y-6">
          <h3 className="text-2xl font-semibold">Paleta de Colores Financieramente</h3>
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
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Components Demo */}
        <section className="space-y-6">
          <h3 className="text-2xl font-semibold">Componentes Shadcn/UI</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Formularios</CardTitle>
                <CardDescription>Componentes de entrada de datos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="tu@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" type="password" />
                </div>
                <Button className="w-full">Iniciar Sesión</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feedback Visual</CardTitle>
                <CardDescription>Alertas y progreso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTitle>Información</AlertTitle>
                  <AlertDescription>
                    Sistema de temas implementado correctamente.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label>Progreso de implementación</Label>
                  <Progress value={85} className="w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Theme Toggle Demo */}
        <section className="space-y-6">
          <h3 className="text-2xl font-semibold">Cambio de Tema</h3>
          <Card>
            <CardHeader>
              <CardTitle>Prueba el Cambio Dinámico</CardTitle>
              <CardDescription>
                Usa el botón en la esquina superior derecha para cambiar entre tema claro y oscuro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center space-x-4">
                <ThemeToggle />
                <p className="text-muted-foreground">
                  El cambio es instantáneo y se mantiene en la sesión
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Accessibility Info */}
        <section className="space-y-6">
          <h3 className="text-2xl font-semibold">Accesibilidad WCAG AA</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">✓ Contraste Verificado</CardTitle>
                <CardDescription>Ratios de contraste cumplen WCAG AA</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Texto sobre fondo: 4.5:1 mínimo</li>
                  <li>• Texto grande: 3:1 mínimo</li>
                  <li>• Elementos interactivos: 3:1 mínimo</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">✓ Navegación por Teclado</CardTitle>
                <CardDescription>Soporte completo para navegación accesible</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Focus visible en todos los elementos</li>
                  <li>• Navegación con Tab y Shift+Tab</li>
                  <li>• Activación con Enter y Espacio</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-16">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-muted-foreground">
            © 2024 Financieramente - Sistema de Temas Implementado con Shadcn/UI
          </p>
        </div>
      </footer>
    </div>
  )
}