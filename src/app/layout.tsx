import type { Metadata } from 'next'
import './tailwind.css'
import './globals.css'
import { ThemeProvider } from '@/features/shared/ui/ThemeProvider'
import { Toaster } from '@/features/shared/ui/sonner'
import { AuthProvider } from '@/features/shared/providers/auth-provider'
import { FlagsmithProvider } from '@/features/shared/providers/flagsmith-provider'
import { getFlagsmithServerState } from '@/features/shared/lib/flagsmith-server'
import { auth } from '@/auth'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
	title: 'Financieramente - Plataforma de Liquidación de Comisiones',
	description: 'Sistema de gestión y liquidación de comisiones financieras',
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const session = await auth()
	const flagsmithServerState = await getFlagsmithServerState(
		session?.user?.email ?? undefined
	)

	return (
		<html lang="es" suppressHydrationWarning>
			<body className={cn('font-sans antialiased')}>
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem
					disableTransitionOnChange
				>
					<AuthProvider>
						<FlagsmithProvider
					serverState={flagsmithServerState}
					identity={session?.user?.email ?? undefined}
				>
							{children}
							<Toaster />
						</FlagsmithProvider>
					</AuthProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}
