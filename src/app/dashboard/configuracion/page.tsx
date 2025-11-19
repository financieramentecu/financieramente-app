import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Página de Configuración
 * 
 * Configuración del sistema (solo para roles con permiso)
 */
export default async function ConfiguracionPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar permisos
  if (!session.user.permissions?.configuracion) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout currentPage="Configuración">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">
            Configura las opciones del sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuración del Sistema</CardTitle>
            <CardDescription>
              Gestiona las configuraciones generales del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Próximamente podrás configurar opciones del sistema desde aquí.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

