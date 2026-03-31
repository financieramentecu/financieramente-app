'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, FileQuestion } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'

/**
 * Página 404 - Página no encontrada
 *
 * Se muestra cuando el usuario intenta acceder a una ruta que no existe
 */
export default function NotFound() {
	const router = useRouter()

	const handleGoBack = () => {
		if (window.history.length > 1) {
			router.back()
		} else {
			router.push('/dashboard')
		}
	}
	return (
		<div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
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
						{/* Icono de página no encontrada */}
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
							<FileQuestion className="h-8 w-8 text-primary" />
						</div>
					</div>
					<CardTitle className="text-2xl text-primary">
						Página no encontrada
					</CardTitle>
					<CardDescription className="text-base mt-2">
						Lo sentimos, la página que estás buscando no existe o ha sido
						movida.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="rounded-lg border bg-muted/50 p-4">
						<h3 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
							<FileQuestion className="h-4 w-4" />
							¿Qué puedes hacer?
						</h3>
						<ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
							<li>Verifica que la URL esté escrita correctamente</li>
							<li>La página puede haber sido movida o eliminada</li>
							<li>Intenta navegar desde el menú principal</li>
						</ul>
					</div>

					<div className="flex flex-col sm:flex-row gap-3">
						<Button asChild className="flex-1">
							<Link href="/dashboard">
								<Home className="mr-2 h-4 w-4" />
								Ir al Dashboard
							</Link>
						</Button>
						<Button variant="outline" className="flex-1" onClick={handleGoBack}>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Volver atrás
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
