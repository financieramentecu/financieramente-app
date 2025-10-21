"use client"

import { FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface EmailSignInFormProps {
  placeholder?: string
  submitLabel?: string
  isSubmitting?: boolean
  defaultValue?: string
  onSubmit?: (email: string) => void | Promise<void>
}

export function EmailSignInForm({
  placeholder = "name@example.com",
  submitLabel = "Ingresar con correo",
  isSubmitting = false,
  defaultValue = "",
  onSubmit,
}: EmailSignInFormProps) {
  const [email, setEmail] = useState(defaultValue)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!onSubmit) {
      return
    }
    await onSubmit(email)
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="login-email" className="sr-only">
          Correo electrónico
        </Label>
        <Input
          id="login-email"
          type="email"
          placeholder={placeholder}
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || email.trim().length === 0}
      >
        {isSubmitting ? "Ingresando..." : submitLabel}
      </Button>
    </form>
  )
}
