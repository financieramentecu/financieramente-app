import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// UserRole import removed - not used

/**
 * Página de Reportes Personales
 * 
 * Muestra reportes personales del usuario (comisiones y producción)
 * Principalmente para agentes
 */
export default async function ReportesPersonalesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar que tenga permiso para reportes personales
  if (!session.user.permissions?.reportes?.personal) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout currentPage="Mis Reportes">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mis Reportes</h1>
          <p className="text-muted-foreground">
            Reportes personales de tus comisiones y producción
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Comisiones y Producción</CardTitle>
            <CardDescription>
              Visualiza tus estadísticas personales de comisiones y producción
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Próximamente podrás ver tus reportes de comisiones y producción personal.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

