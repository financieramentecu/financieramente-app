import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './tailwind.css'
import './globals.css'
import { ThemeProvider } from '@/features/shared/ui/ThemeProvider'
import { Toaster } from '@/features/shared/ui/sonner'
import { AuthProvider } from '@/features/shared/providers/auth-provider'
import { cn } from '@/lib/utils'

const inter = Inter({
	subsets: ['latin'],
	display: 'swap',
	variable: '--font-inter',
})

export const metadata: Metadata = {
	title: 'Financieramente - Plataforma de Liquidación de Comisiones',
	description: 'Sistema de gestión y liquidación de comisiones financieras',
	icons: {
		icon: '/brand/isotipo.svg',
		apple: '/brand/isotipo.svg',
	},
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="es" className={cn(inter.variable)} suppressHydrationWarning>
			<body className={cn('font-sans antialiased')}>
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem
					disableTransitionOnChange
				>
					<AuthProvider>
						{children}
						<Toaster />
					</AuthProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}
