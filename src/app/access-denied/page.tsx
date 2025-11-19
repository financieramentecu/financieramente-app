"use client"

import React from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, ArrowLeft, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/**
 * Página de Acceso Denegado
 * 
 * Se muestra cuando:
 * - Usuario está inactivo
 * - Usuario tiene rol DEFAULT (pendiente de activación)
 * - Usuario no tiene permisos para acceder
 */
export default function AccessDeniedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get("reason") || "default"

  const messages = {
    inactive: {
      title: "⛔ Cuenta Desactivada",
      description: "Cuenta Desactivada. Debes solicitar la activación, contacta al administrador.",
      details: "Tu cuenta ha sido desactivada o está pendiente de activación. Por favor, contacta al administrador del sistema para solicitar la activación de tu cuenta.",
    },
    default_role: {
      title: "⏳ Cuenta Pendiente de Activación",
      description: "Tu cuenta está pendiente de activación por el administrador.",
      details: "Tu cuenta ha sido creada pero aún no ha sido activada. El administrador debe asignarte un rol y activar tu cuenta para que puedas acceder al sistema.",
    },
    no_permissions: {
      title: "🚫 Acceso Denegado",
      description: "No tienes permisos para acceder a esta sección.",
      details: "No tienes los permisos necesarios para acceder a esta funcionalidad. Si crees que esto es un error, contacta al administrador.",
    },
    default: {
      title: "🚫 Acceso Denegado",
      description: "No tienes permisos para acceder al sistema. Si tu cuenta fue desactivada, contacta al administrador.",
      details: "Tu acceso al sistema ha sido restringido. Si tu cuenta fue desactivada o necesitas permisos adicionales, contacta al administrador.",
    },
  }

  const message = messages[reason as keyof typeof messages] || messages.default

  const handleGoBack = () => {
    router.back()
  }

  const handleGoHome = () => {
    router.push("/")
  }

  const handleContactAdmin = () => {
    // Abrir cliente de email o copiar email al portapapeles
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@financieramentecu.com"
    window.location.href = `mailto:${adminEmail}?subject=Solicitud de Activación de Cuenta&body=Hola,%0D%0A%0D%0ASolicito la activación de mi cuenta en el sistema de liquidación de comisiones.%0D%0A%0D%0AGracias.`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6 flex flex-col items-center gap-4">
            {/* Logo de Financiera */}
            <div className="flex items-center justify-center">
              <Image
                src="/logos/logo-financiera.svg"
                alt="Financiera mente"
                width={200}
                height={50}
                className="h-auto w-auto"
                priority
              />
            </div>
            {/* Icono de advertencia */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">{message.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {message.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Información Importante</AlertTitle>
            <AlertDescription>{message.details}</AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                ¿Qué puedes hacer?
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Contacta al administrador del sistema para solicitar la activación</li>
                <li>Verifica que tu cuenta esté correctamente configurada</li>
                <li>Espera a que el administrador asigne los permisos necesarios</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleContactAdmin}
              className="flex-1"
              variant="default"
            >
              <Mail className="mr-2 h-4 w-4" />
              Contactar Administrador
            </Button>
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button
              onClick={handleGoHome}
              variant="ghost"
            >
              Ir al Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

