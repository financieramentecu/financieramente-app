import React, { Suspense } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Lock, UserX, ShieldAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import Link from "next/link"

/**
 * Componente interno que lee los query params
 */
function AccessDeniedContent({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const params = React.use(searchParams)
  const reason = params.reason || "no_permissions"

  const reasonMessages: Record<string, {
    icon: React.ReactNode
    title: string
    description: string
    details: string
  }> = {
    default_role: {
      icon: <UserX className="h-5 w-5" />,
      title: "⛔ Cuenta Pendiente de Activación",
      description: "Tu cuenta ha sido creada pero aún no está activa.",
      details: "Tu cuenta está pendiente de activación y asignación de permisos por parte de un administrador. Por favor, contacta al administrador del sistema para que active tu cuenta y asigne los permisos correspondientes.",
    },
    inactive: {
      icon: <Lock className="h-5 w-5" />,
      title: "⛔ Cuenta Desactivada",
      description: "Tu cuenta ha sido desactivada.",
      details: "Tu cuenta está actualmente desactivada. Para reactivar tu cuenta, debes solicitar la activación contactando al administrador del sistema.",
    },
    no_permissions: {
      icon: <ShieldAlert className="h-5 w-5" />,
      title: "Acceso Denegado",
      description: "No tienes permisos para acceder al sistema.",
      details: "Tu cuenta no tiene los permisos necesarios para acceder al sistema. Si crees que esto es un error, contacta al administrador.",
    },
  }

  const message = reasonMessages[reason] || reasonMessages.no_permissions

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            {message.icon}
          </div>
          <CardTitle className="text-2xl">{message.title}</CardTitle>
          <CardDescription>{message.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atención</AlertTitle>
            <AlertDescription>{message.details}</AlertDescription>
          </Alert>

          <div className="flex flex-col gap-2">
            <Button asChild variant="outline">
              <Link href="/login">Volver al Login</Link>
            </Button>
            <Button asChild variant="ghost" className="text-sm">
              <a href={`mailto:admin@financieramentecu.com?subject=Solicitud de Activación de Cuenta&body=Hola,%0D%0A%0D%0ASolicito la activación de mi cuenta en el sistema de Liquidación Nacional.%0D%0A%0D%0AGracias.`}>
                Contactar Administrador
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Página de Acceso Denegado
 * 
 * Muestra mensajes personalizados según el motivo del acceso denegado:
 * - default_role: Usuario con rol DEFAULT (pendiente de activación)
 * - inactive: Usuario con cuenta desactivada
 * - no_permissions: Usuario sin permisos asignados
 */
export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const session = await auth()

  // Si no hay sesión, redirigir a login
  if (!session) {
    redirect("/login")
  }

  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    }>
      <AccessDeniedContent searchParams={searchParams} />
    </Suspense>
  )
}
