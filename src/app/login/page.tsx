"use client"

export const dynamic = 'force-dynamic'

import { Suspense } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { LoginView, type EmailSignInFormProps } from "@/components/auth/login"
import { GoogleIcon } from "@/components/auth/login/social-sign-in"
import { toast } from "sonner"
import type { SocialProvider } from "@/components/auth/login/social-sign-in"

/**
 * Componente interno que usa useSearchParams
 */
function LoginContent() {
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard"

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true)
      await signIn("google", {
        callbackUrl,
        redirect: true,
      })
      // Si redirect: true, signIn no retorna (la redirección maneja el flujo)
    } catch (error) {
      console.error("Error en autenticación:", error)
      toast.error("Error inesperado", {
        description: "Ocurrió un error al intentar iniciar sesión.",
      })
      setIsSubmitting(false)
    }
  }

  const handleEmailSignIn: EmailSignInFormProps["onSubmit"] = async () => {
    // Para Google OAuth, redirigimos al flujo de Google
    toast.info("Usa Google para iniciar sesión", {
      description: "Por favor, usa el botón de Google para autenticarte.",
    })
    await handleGoogleSignIn()
  }

  const socialProviders: SocialProvider[] = [
    {
      id: "google",
      label: "Continuar con Google",
      icon: <GoogleIcon className="size-5" />,
      onClick: handleGoogleSignIn,
      buttonProps: {
        disabled: isSubmitting,
      },
    },
  ]

  return (
    <LoginView
      emailForm={{
        placeholder: "usuario@financieramentecu.com",
        submitLabel: "Ingresar con correo",
        isSubmitting,
        onSubmit: handleEmailSignIn,
      }}
      socialProviders={socialProviders}
      termsLink={{
        label: "Términos y condiciones",
        href: "#",
      }}
    />
  )
}

/**
 * Página de Login
 * 
 * Integra el componente LoginView maquetado con NextAuth
 * Maneja la autenticación con Google OAuth
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginContent />
    </Suspense>
  )
}

