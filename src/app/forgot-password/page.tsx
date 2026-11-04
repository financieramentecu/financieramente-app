import type { Metadata } from 'next'
import { ForgotPasswordScreen } from '@/features/auth/components/account/forgot-password-screen'

export const metadata: Metadata = {
	title: 'Recuperar contraseña - Financieramente',
}

export default function ForgotPasswordPage() {
	return <ForgotPasswordScreen />
}
