'use client'

import Link from 'next/link'
import { AlertTriangle, ExternalLink, User } from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/features/shared/ui/dialog'
import { Button } from '@/features/shared/ui/button'
import type { RegistroConError } from '../types/types'

const ERROR_LABELS: Record<string, string> = {
	FIXED_MISSING_USER: 'Usuario fijo no configurado',
	FIXED_USER_INACTIVE: 'Usuario fijo inactivo',
	UPLINE_AGENT_NO_CATEGORY: 'El agente no tiene categoría asignada',
	UPLINE_NO_LEADER: 'El agente no tiene líder asignado',
	UPLINE_LEADER_NO_CATEGORY: 'El líder no tiene categoría asignada',
	UPLINE_NO_MATCH: 'Sin coincidencia en cadena de ventas',
}

interface ModalErroresConfiguracionProps {
	registrosConError: RegistroConError[]
	open: boolean
	onClose: () => void
}

/**
 * Modal que muestra los errores de configuración ocurridos durante la pre-liquidación.
 * Solo se monta cuando registrosConError.length > 0.
 */
export function ModalErroresConfiguracion({
	registrosConError,
	open,
	onClose,
}: ModalErroresConfiguracionProps) {
	if (registrosConError.length === 0) return null

	return (
		<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
			<DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-lg font-semibold">
						<AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
						Registros con error de configuración
						<span className="ml-1 inline-flex items-center justify-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
							{registrosConError.length} {registrosConError.length === 1 ? 'registro' : 'registros'}
						</span>
					</DialogTitle>
				</DialogHeader>

				<p className="text-sm text-muted-foreground">
					Los siguientes registros no pudieron ser pre-liquidados por errores en la
					configuración del beneficiario. Usá los links para ir directo a corregir
					la configuración y volvé a procesar.
				</p>

				<div className="overflow-auto flex-1 rounded-md border border-border">
					<table className="w-full text-sm">
						<thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
							<tr className="border-b border-border">
								<th className="text-left py-2.5 px-4 font-semibold text-foreground whitespace-nowrap">
									# Liquidación
								</th>
								<th className="text-left py-2.5 px-4 font-semibold text-foreground whitespace-nowrap">
									Contrato
								</th>
								<th className="text-left py-2.5 px-4 font-semibold text-foreground whitespace-nowrap">
									Agente
								</th>
								<th className="text-left py-2.5 px-4 font-semibold text-foreground whitespace-nowrap">
									Categoría
								</th>
								<th className="text-left py-2.5 px-4 font-semibold text-foreground">
									Motivo del error
								</th>
							</tr>
						</thead>
						<tbody>
							{registrosConError.map((error) => (
								<tr
									key={error.idSettlementCommission}
									className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
								>
									{/* ID Liquidación → link al negocio */}
									<td className="py-2.5 px-4">
										{error.idBusiness ? (
											<Link
												href={`/dashboard/negocios/editar/${error.idBusiness}`}
												className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 px-2 py-1 rounded transition-colors"
												onClick={onClose}
											>
												{error.idSettlementCommission}
												<ExternalLink className="h-3 w-3 opacity-60" />
											</Link>
										) : (
											<span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">
												{error.idSettlementCommission}
											</span>
										)}
									</td>

									{/* Contrato */}
									<td className="py-2.5 px-4">
										<span className="font-mono text-xs text-foreground bg-muted px-2 py-1 rounded">
											{error.contrato ?? '—'}
										</span>
									</td>

									{/* Agente → link a config de usuario */}
									<td className="py-2.5 px-4">
										{error.idUserAgent ? (
											<Link
												href={`/dashboard/admin/users/${error.idUserAgent}`}
												className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/8 hover:bg-primary/15 px-2.5 py-1 rounded-full transition-colors border border-primary/20"
												onClick={onClose}
											>
												<User className="h-3 w-3" />
												Ver agente
												<ExternalLink className="h-3 w-3 opacity-60" />
											</Link>
										) : (
											<span className="text-muted-foreground text-xs">—</span>
										)}
									</td>

									{/* Categoría */}
									<td className="py-2.5 px-4">
										<span className="inline-flex items-center font-semibold text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
											{error.categoryCode}
										</span>
									</td>

									{/* Motivo */}
									<td className="py-2.5 px-4">
										<span className="inline-flex items-center gap-1.5 text-xs text-destructive">
											<AlertTriangle className="h-3.5 w-3.5 shrink-0" />
											{ERROR_LABELS[error.errorCode] ?? error.errorCode}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cerrar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
