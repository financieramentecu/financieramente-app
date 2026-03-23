'use client'

import * as React from 'react'
import { CalendarIcon, FileText } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/features/shared/ui/dialog'
import type { LiquidationDetail } from '@/features/shared/types/liquidation.types'

export interface LiquidationDetailModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	liquidation: LiquidationDetail
	onEdit?: () => void
	onCancel?: () => void
}

export const LiquidationDetailModal = React.forwardRef<
	HTMLDivElement,
	LiquidationDetailModalProps
>(({ open, onOpenChange, liquidation, onEdit, onCancel }, ref) => {
	const getStatusColor = (status: string) => {
		switch (status) {
			case 'Efectuada':
				return 'bg-success text-primary-foreground'
			case 'Pendiente':
				return 'bg-warning text-primary-foreground'
			case 'Cancelada':
				return 'bg-destructive text-destructive-foreground'
			case 'Activo':
				return 'bg-info text-primary-foreground'
			default:
				return 'bg-muted text-foreground'
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				ref={ref}
				className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
			>
				<DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b gap-3">
					<div className="flex flex-wrap items-center gap-3 min-w-0">
						<DialogTitle className="text-xl font-bold text-foreground">
							Detalle de Liquidación
						</DialogTitle>
						<Badge
							className={`${getStatusColor(liquidation.status)} text-sm px-3 py-1 rounded-full`}
						>
							{liquidation.status}
						</Badge>
					</div>
				</DialogHeader>

				<div className="space-y-6 py-6">
					{/* First Row: Client and Agent Information - 2 columns */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						{/* Client Information */}
						<div className="bg-info-muted rounded-lg p-4">
							<div className="flex items-center gap-3 mb-4">
								<Avatar className="h-16 w-16">
									<AvatarImage
										src={liquidation.client.avatar}
										alt={liquidation.client.name}
									/>
									<AvatarFallback className="bg-muted text-foreground">
										{liquidation.client.name
											.split(' ')
											.map((n) => n[0])
											.join('')}
									</AvatarFallback>
								</Avatar>
								<div>
									<h3 className="font-bold text-foreground">
										{liquidation.client.name}
									</h3>
									<p className="text-foreground text-sm">
										{liquidation.client.identificationType}{' '}
										{liquidation.client.identification}
									</p>
									<Badge className="mt-1 bg-muted text-foreground hover:bg-muted">
										{liquidation.client.status}
									</Badge>
								</div>
							</div>
							<div className="border-t border-border pt-3">
								<h4 className="font-bold text-foreground mb-2 text-sm">
									Información cliente
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-muted-foreground">email</span>
										<p className="text-foreground font-medium text-xs break-all">
											{liquidation.client.email}
										</p>
									</div>
									<div>
										<span className="text-muted-foreground">No. contacto</span>
										<p className="text-foreground font-medium">
											{liquidation.client.contactNumber}
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Agent Information */}
						<div className="bg-muted rounded-lg p-4">
							<h4 className="font-bold text-foreground mb-3 text-sm">
								Información del agente
							</h4>
							<div className="flex items-center gap-3 mb-4">
								<Avatar className="h-16 w-16">
									<AvatarImage
										src={liquidation.agent.avatar}
										alt={liquidation.agent.name}
									/>
									<AvatarFallback className="bg-muted text-foreground">
										{liquidation.agent.name
											.split(' ')
											.map((n) => n[0])
											.join('')}
									</AvatarFallback>
								</Avatar>
								<div>
									<p className="font-bold text-foreground">
										{liquidation.agent.name}
									</p>
									<p className="text-muted-foreground text-sm">
										{liquidation.agent.role}
									</p>
								</div>
							</div>
							<div className="border-t border-border pt-3">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-muted-foreground">Correo electronico</span>
										<p className="text-foreground font-medium text-xs break-all">
											{liquidation.agent.email}
										</p>
									</div>
									<div>
										<span className="text-muted-foreground">No. contacto</span>
										<p className="text-foreground font-medium">
											{liquidation.agent.contactNumber}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Amount */}
					<div className="text-4xl font-bold text-foreground text-center">
						$ {liquidation.amount.toLocaleString('es-CO')}{' '}
						{liquidation.currency.toLowerCase()}
					</div>

					{/* Second Row: Insurance and Product - 2 columns */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						{/* Insurance Company Card */}
						<div className="border border-border rounded-lg p-4 bg-card">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 bg-gradient-to-br from-yellow-400 to-purple-500 rounded-lg flex items-center justify-center">
										<FileText className="h-6 w-6 text-white" />
									</div>
									<div>
										<p className="text-muted-foreground text-xs">
											{liquidation.insurance.code}
										</p>
										<p className="font-bold text-foreground">
											{liquidation.insurance.name}
										</p>
									</div>
								</div>
								<div className="text-right">
									<p className="text-muted-foreground text-xs">Perioricidad</p>
									<p className="text-foreground font-semibold">
										{liquidation.product.periodicity ||
											liquidation.product.term}
									</p>
									<p className="text-muted-foreground text-xs mt-1">Moneda</p>
									<p className="text-foreground font-semibold">
										{liquidation.currency}
									</p>
								</div>
							</div>
						</div>

						{/* Product Details Card */}
						<div className="border border-border rounded-lg p-4 bg-card">
							<div className="flex items-center gap-3 mb-4">
								<div className="h-10 w-10 bg-gradient-to-br from-yellow-400 to-purple-500 rounded-lg flex items-center justify-center">
									<FileText className="h-6 w-6 text-white" />
								</div>
								<div>
									<p className="text-muted-foreground text-xs">producto</p>
									<p className="font-bold text-foreground">
										{liquidation.product.name}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 text-foreground mb-2">
								<CalendarIcon className="h-5 w-5" />
								<span className="text-sm">{liquidation.product.date}</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground text-sm">Plazo</span>
								<span className="text-foreground font-semibold">
									{liquidation.product.term}
								</span>
							</div>
						</div>
					</div>
				</div>

				<DialogFooter className="flex-col-reverse sm:flex-row justify-end gap-3">
					<Button
						variant="outline"
						onClick={onCancel}
						className="border-border text-foreground"
					>
						Cancelar
					</Button>
					<Button
						onClick={onEdit}
						className="bg-primary hover:bg-primary/90 text-primary-foreground"
					>
						Editar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
})

LiquidationDetailModal.displayName = 'LiquidationDetailModal'
