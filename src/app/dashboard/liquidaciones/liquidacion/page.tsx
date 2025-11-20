import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

/**
 * Página de Liquidación
 * 
 * Permite procesar y ejecutar liquidaciones de comisiones
 */
export default async function LiquidacionPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar permisos
  if (!session.user.permissions?.liquidaciones?.liquidacion) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout currentPage="Liquidación">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Liquidación</h1>
          <p className="text-muted-foreground">
            Procesa y ejecuta liquidaciones de comisiones
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Nueva Liquidación
            </CardTitle>
            <CardDescription>
              Procesa una liquidación de comisiones basada en una preliquidación aprobada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Próximamente podrás procesar liquidaciones de comisiones.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Podrás seleccionar preliquidaciones aprobadas y ejecutar el proceso de liquidación.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

