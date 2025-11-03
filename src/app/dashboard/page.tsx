"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthSession } from "@/hooks/use-auth-session"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, User, Mail, Building2 } from "lucide-react"

/**
 * Página de Dashboard (Ruta Privada)
 * 
 * Requiere autenticación para acceder
 * Muestra información del usuario autenticado
 */
export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuthSession()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login?callbackUrl=/dashboard")
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <DashboardLayout currentPage="Dashboard">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <DashboardLayout currentPage="Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Bienvenido, {user.name || "Usuario"}
          </h1>
          <p className="text-muted-foreground">
            Sistema de Liquidación de Comisiones - Financieramente
          </p>
        </div>

        {/* Success Alert */}
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            Sesión iniciada correctamente
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            Has iniciado sesión con tu cuenta corporativa de Google Workspace.
          </AlertDescription>
        </Alert>

        {/* User Info Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Información del Usuario</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.name || "Sin nombre"}</div>
              <p className="text-xs text-muted-foreground">
                Usuario autenticado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Correo Electrónico</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{user.email}</div>
              <p className="text-xs text-muted-foreground">
                Dominio corporativo verificado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organización</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Financieramente</div>
              <p className="text-xs text-muted-foreground">
                Google Workspace
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Content */}
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>
              Panel principal del sistema de liquidación de comisiones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aquí podrás gestionar tus negocios, liquidaciones y estadísticas.
              Las funcionalidades estarán disponibles próximamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

