'use client'

/**
 * Modal para visualización de detalle de negocio
 */

import { Modal } from '@/features/shared/ui/modal'
import { Button } from '@/features/shared/ui/button'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { BusinessStatusBadge } from '../ui/BusinessStatusBadge'
import { UserAvatar } from '../ui/UserAvatar'
import { formatCurrency } from '@/features/admin/currencies/lib/currency-formatters'
import { Calendar, Phone, Mail, Building2, FileText, Clock } from 'lucide-react'
import type { BusinessEntity } from '../../types/business-entity.types'

interface BusinessViewModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	business: BusinessEntity | null
	isLoading?: boolean
}

/**
 * Modal de visualización de negocio
 * Muestra información completa del negocio en modo solo lectura
 *
 * @example
 * ```tsx
 * <BusinessViewModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   business={selectedBusiness}
 * />
 * ```
 */
export function BusinessViewModal({
	open,
	onOpenChange,
	business,
	isLoading,
}: BusinessViewModalProps) {
	if (isLoading) {
		return (
			<Modal
				open={open}
				onOpenChange={onOpenChange}
				title="Cargando..."
				size="lg"
			>
				<BusinessViewSkeleton />
			</Modal>
		)
	}

	if (!business) {
		return null
	}

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title={`Negocio #${business.id}`}
			size="lg"
		>
			<div className="space-y-6">
				{/* Header con estado y valor */}
				<div className="flex items-center justify-between pb-4 border-b">
					<BusinessStatusBadge status={business.status} />
					<span className="text-2xl font-bold text-primary">
						{formatCurrency(business.value, business.currency.name)}
					</span>
				</div>

				{/* Información del Cliente */}
				<section className="space-y-3">
					<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
						Cliente
					</h3>
					<div className="flex items-start gap-4">
						<UserAvatar name={business.client.fullName} size="lg" />
						<div className="flex-1 space-y-1">
							<p className="font-semibold text-lg">
								{business.client.fullName}
							</p>
							<p className="text-sm text-muted-foreground flex items-center gap-2">
								<FileText className="h-4 w-4" />
								{business.client.identityNumber}
							</p>
							{business.client.email && (
								<p className="text-sm flex items-center gap-2">
									<Mail className="h-4 w-4 text-muted-foreground" />
									{business.client.email}
								</p>
							)}
							{business.client.phone && (
								<p className="text-sm flex items-center gap-2">
									<Phone className="h-4 w-4 text-muted-foreground" />
									{business.client.phone}
								</p>
							)}
						</div>
					</div>
				</section>

				{/* Información del Producto */}
				<section className="space-y-3">
					<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
						Producto
					</h3>
					<div className="grid grid-cols-2 gap-4">
						<InfoItem label="Producto" value={business.product.name} />
						<InfoItem
							label="Compañía"
							value={business.product.companyName}
							icon={<Building2 className="h-4 w-4" />}
						/>
						<InfoItem
							label="Plazo"
							value={business.term ? `${business.term} meses` : '-'}
							icon={<Calendar className="h-4 w-4" />}
						/>
						<InfoItem
							label="Periodicidad"
							value={business.periodicity?.name || '-'}
							icon={<Clock className="h-4 w-4" />}
						/>
						<InfoItem
							label="# Contrato"
							value={business.contract || 'Sin asignar'}
							className="col-span-2"
						/>
					</div>
				</section>

				{/* Información del Agente */}
				<section className="space-y-3">
					<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
						Agente Responsable
					</h3>
					<div className="flex items-start gap-4">
						<UserAvatar name={business.agent.fullName} size="md" />
						<div className="flex-1 space-y-1">
							<p className="font-medium">{business.agent.fullName}</p>
							{business.agent.roleName && (
								<p className="text-sm text-muted-foreground">
									{business.agent.roleName}
								</p>
							)}
							<p className="text-sm flex items-center gap-2">
								<Mail className="h-4 w-4 text-muted-foreground" />
								{business.agent.email}
							</p>
							{business.agent.phone && (
								<p className="text-sm flex items-center gap-2">
									<Phone className="h-4 w-4 text-muted-foreground" />
									{business.agent.phone}
								</p>
							)}
						</div>
					</div>
				</section>

				{/* Origen y Fecha */}
				<section className="flex justify-between text-sm text-muted-foreground pt-4 border-t">
					<span>Origen: {business.clientOrigin.name}</span>
					<span>
						Registrado:{' '}
						{new Date(business.createdAt).toLocaleDateString('es-CO')}
					</span>
				</section>

				{/* Botón Cerrar */}
				<div className="flex justify-end pt-4">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cerrar
					</Button>
				</div>
			</div>
		</Modal>
	)
}

/**
 * Componente para mostrar un item de información
 */
function InfoItem({
	label,
	value,
	icon,
	className,
}: {
	label: string
	value: string
	icon?: React.ReactNode
	className?: string
}) {
	return (
		<div className={className}>
			<span className="text-sm text-muted-foreground">{label}</span>
			<p className="font-medium flex items-center gap-2">
				{icon}
				{value}
			</p>
		</div>
	)
}

/**
 * Skeleton para estado de carga
 */
function BusinessViewSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header con estado y valor */}
			<div className="flex items-center justify-between pb-4 border-b">
				<Skeleton className="h-6 w-24 rounded-full" />
				<Skeleton className="h-8 w-32" />
			</div>

			{/* Información del Cliente */}
			<section className="space-y-3">
				<Skeleton className="h-4 w-20" />
				<div className="flex items-start gap-4">
					<Skeleton className="h-12 w-12 rounded-full shrink-0" />
					<div className="space-y-2 flex-1">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-4 w-36" />
					</div>
				</div>
			</section>

			{/* Información del Producto */}
			<section className="space-y-3">
				<Skeleton className="h-4 w-20" />
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-5 w-full" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-5 w-full" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-5 w-full" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-5 w-full" />
					</div>
					<div className="space-y-2 col-span-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-5 w-full" />
					</div>
				</div>
			</section>

			{/* Información del Agente */}
			<section className="space-y-3">
				<Skeleton className="h-4 w-32" />
				<div className="flex items-start gap-4">
					<Skeleton className="h-10 w-10 rounded-full shrink-0" />
					<div className="space-y-2 flex-1">
						<Skeleton className="h-5 w-36" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>
			</section>

			{/* Origen y Fecha */}
			<section className="flex justify-between text-sm pt-4 border-t">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-4 w-40" />
			</section>

			{/* Botón Cerrar */}
			<div className="flex justify-end pt-4">
				<Skeleton className="h-10 w-24" />
			</div>
		</div>
	)
}
