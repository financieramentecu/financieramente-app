'use client'

import { FormEvent, useState } from 'react'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'

export interface EmailPasswordFormProps {
    emailPlaceholder?: string
    passwordPlaceholder?: string
    submitLabel?: string
    isSubmitting?: boolean
    onSubmit?: (email: string, password: string) => void | Promise<void>
}

export function EmailPasswordForm({
    emailPlaceholder = 'admin@financieramentecu.com',
    passwordPlaceholder = '••••••••',
    submitLabel = 'Ingresar',
    isSubmitting = false,
    onSubmit,
}: EmailPasswordFormProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!onSubmit) {
            return
        }
        await onSubmit(email, password)
    }

    const isFormValid = email.trim().length > 0 && password.trim().length > 0

    return (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
                <Label htmlFor="login-email">Correo electrónico</Label>
                <Input
                    id="login-email"
                    type="email"
                    placeholder={emailPlaceholder}
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={isSubmitting}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <Input
                    id="login-password"
                    type="password"
                    placeholder={passwordPlaceholder}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    disabled={isSubmitting}
                />
            </div>
            <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !isFormValid}
            >
                {isSubmitting ? 'Ingresando...' : submitLabel}
            </Button>
        </form>
    )
}
