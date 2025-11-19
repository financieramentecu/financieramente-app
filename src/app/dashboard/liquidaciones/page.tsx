import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Página de Liquidaciones
 * 
 * Muestra opciones de preliquidación y liquidación
 */
export default async function LiquidacionesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar permisos
  const canViewLiquidaciones = 
    session.user.permissions?.liquidaciones?.preliquidacion || 
    session.user.permissions?.liquidaciones?.liquidacion

  if (!canViewLiquidaciones) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout currentPage="Liquidaciones">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Liquidaciones</h1>
          <p className="text-muted-foreground">
            Gestiona las preliquidaciones y liquidaciones de comisiones
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {session.user.permissions?.liquidaciones?.preliquidacion && (
            <Card>
              <CardHeader>
                <CardTitle>Preliquidación</CardTitle>
                <CardDescription>
                  Crea y gestiona preliquidaciones de comisiones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Próximamente podrás crear y gestionar preliquidaciones.
                </p>
              </CardContent>
            </Card>
          )}

          {session.user.permissions?.liquidaciones?.liquidacion && (
            <Card>
              <CardHeader>
                <CardTitle>Liquidación</CardTitle>
                <CardDescription>
                  Procesa y ejecuta liquidaciones de comisiones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Próximamente podrás procesar liquidaciones de comisiones.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

