import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

/**
 * Página de Preliquidación
 * 
 * Permite crear y gestionar preliquidaciones de comisiones
 */
export default async function PreliquidacionPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar permisos
  if (!session.user.permissions?.liquidaciones?.preliquidacion) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout currentPage="Preliquidación">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Preliquidación</h1>
          <p className="text-muted-foreground">
            Crea y gestiona preliquidaciones de comisiones
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Nueva Preliquidación
            </CardTitle>
            <CardDescription>
              Genera una preliquidación de comisiones para revisión
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Próximamente podrás crear y gestionar preliquidaciones de comisiones.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Podrás seleccionar períodos, agentes, productos y generar reportes de preliquidación.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

