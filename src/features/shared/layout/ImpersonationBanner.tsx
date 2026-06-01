'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/features/shared/ui/button'
import { AlertTriangle, LogOut } from 'lucide-react'

export function ImpersonationBanner() {
	const { data: session, update } = useSession()

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if (!(session?.user as any)?.originalUserId) {
		return null
	}

	const handleStopImpersonating = async () => {
		await update({ impersonateUserId: 'STOP' })
		// Opcional: forzar un recargo de la página para limpiar estados
		window.location.reload()
	}

	return (
		<div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium sticky top-0 z-[100] w-full">
			<div className="flex items-center gap-2">
				<AlertTriangle className="h-4 w-4" />
				<span>
					Estás viendo la aplicación como <strong>{session?.user?.name}</strong> ({session?.user?.role})
				</span>
			</div>
			<Button
				variant="secondary"
				size="sm"
				onClick={handleStopImpersonating}
				className="h-7 text-xs flex items-center gap-2 hover:bg-orange-600 hover:text-white border-transparent bg-white/20"
			>
				<LogOut className="h-3 w-3" />
				Volver a mi sesión Admin
			</Button>
		</div>
	)
}
