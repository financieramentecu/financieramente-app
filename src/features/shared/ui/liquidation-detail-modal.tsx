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
				return 'bg-green-500 text-white'
			case 'Pendiente':
				return 'bg-yellow-500 text-white'
			case 'Cancelada':
				return 'bg-red-500 text-white'
			case 'Activo':
				return 'bg-blue-500 text-white'
			default:
				return 'bg-gray-500 text-white'
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				ref={ref}
				className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
			>
				<DialogHeader className="flex flex-row items-center justify-between pb-4 border-b">
					<div className="flex items-center gap-3">
						<DialogTitle className="text-xl font-bold text-blue-900">
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
					<div className="grid grid-cols-2 gap-6">
						{/* Client Information */}
						<div className="bg-blue-50 rounded-lg p-4">
							<div className="flex items-center gap-3 mb-4">
								<Avatar className="h-16 w-16">
									<AvatarImage
										src={liquidation.client.avatar}
										alt={liquidation.client.name}
									/>
									<AvatarFallback className="bg-blue-200 text-blue-800">
										{liquidation.client.name
											.split(' ')
											.map((n) => n[0])
											.join('')}
									</AvatarFallback>
								</Avatar>
								<div>
									<h3 className="font-bold text-blue-900">
										{liquidation.client.name}
									</h3>
									<p className="text-blue-900 text-sm">
										{liquidation.client.identificationType}{' '}
										{liquidation.client.identification}
									</p>
									<Badge className="mt-1 bg-blue-200 text-blue-900 hover:bg-blue-200">
										{liquidation.client.status}
									</Badge>
								</div>
							</div>
							<div className="border-t pt-3">
								<h4 className="font-bold text-blue-900 mb-2 text-sm">
									Información cliente
								</h4>
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-gray-500">email</span>
										<p className="text-blue-900 font-medium text-xs break-all">
											{liquidation.client.email}
										</p>
									</div>
									<div>
										<span className="text-gray-500">No. contacto</span>
										<p className="text-blue-900 font-medium">
											{liquidation.client.contactNumber}
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Agent Information */}
						<div className="bg-gray-50 rounded-lg p-4">
							<h4 className="font-bold text-blue-900 mb-3 text-sm">
								Información del agente
							</h4>
							<div className="flex items-center gap-3 mb-4">
								<Avatar className="h-16 w-16">
									<AvatarImage
										src={liquidation.agent.avatar}
										alt={liquidation.agent.name}
									/>
									<AvatarFallback className="bg-gray-200 text-blue-900">
										{liquidation.agent.name
											.split(' ')
											.map((n) => n[0])
											.join('')}
									</AvatarFallback>
								</Avatar>
								<div>
									<p className="font-bold text-blue-900">
										{liquidation.agent.name}
									</p>
									<p className="text-gray-500 text-sm">
										{liquidation.agent.role}
									</p>
								</div>
							</div>
							<div className="border-t pt-3">
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-gray-500">Correo electronico</span>
										<p className="text-blue-900 font-medium text-xs break-all">
											{liquidation.agent.email}
										</p>
									</div>
									<div>
										<span className="text-gray-500">No. contacto</span>
										<p className="text-blue-900 font-medium">
											{liquidation.agent.contactNumber}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Amount */}
					<div className="text-4xl font-bold text-blue-900 text-center">
						$ {liquidation.amount.toLocaleString('es-CO')}{' '}
						{liquidation.currency.toLowerCase()}
					</div>

					{/* Second Row: Insurance and Product - 2 columns */}
					<div className="grid grid-cols-2 gap-6">
						{/* Insurance Company Card */}
						<div className="border border-gray-200 rounded-lg p-4 bg-white">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 bg-gradient-to-br from-yellow-400 to-purple-500 rounded-lg flex items-center justify-center">
										<FileText className="h-6 w-6 text-white" />
									</div>
									<div>
										<p className="text-gray-500 text-xs">
											{liquidation.insurance.code}
										</p>
										<p className="font-bold text-blue-900">
											{liquidation.insurance.name}
										</p>
									</div>
								</div>
								<div className="text-right">
									<p className="text-gray-500 text-xs">Perioricidad</p>
									<p className="text-blue-900 font-semibold">
										{liquidation.product.periodicity ||
											liquidation.product.term}
									</p>
									<p className="text-gray-500 text-xs mt-1">Moneda</p>
									<p className="text-blue-900 font-semibold">
										{liquidation.currency}
									</p>
								</div>
							</div>
						</div>

						{/* Product Details Card */}
						<div className="border border-gray-200 rounded-lg p-4 bg-white">
							<div className="flex items-center gap-3 mb-4">
								<div className="h-10 w-10 bg-gradient-to-br from-yellow-400 to-purple-500 rounded-lg flex items-center justify-center">
									<FileText className="h-6 w-6 text-white" />
								</div>
								<div>
									<p className="text-gray-500 text-xs">producto</p>
									<p className="font-bold text-blue-900">
										{liquidation.product.name}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 text-gray-700 mb-2">
								<CalendarIcon className="h-5 w-5" />
								<span className="text-sm">{liquidation.product.date}</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-gray-500 text-sm">Plazo</span>
								<span className="text-blue-900 font-semibold">
									{liquidation.product.term}
								</span>
							</div>
						</div>
					</div>
				</div>

				<DialogFooter className="justify-end gap-3 sm:justify-end">
					<Button
						variant="outline"
						onClick={onCancel}
						className="border-gray-300 text-blue-900"
					>
						Cancelar
					</Button>
					<Button
						onClick={onEdit}
						className="bg-blue-600 hover:bg-blue-700 text-white"
					>
						Editar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
})

LiquidationDetailModal.displayName = 'LiquidationDetailModal'
