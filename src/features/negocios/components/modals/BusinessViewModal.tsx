'use client'

/**
 * Modal para visualización de detalle de negocio
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/features/shared/ui/modal'
import { Button } from '@/features/shared/ui/button'
import { Skeleton } from '@/features/shared/ui/skeleton'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { BusinessStatusBadge } from '../ui/BusinessStatusBadge'
import { UserAvatar } from '../ui/UserAvatar'
import { formatCurrency } from '@/features/admin/currencies/lib/currency-formatters'
import { Calendar, Phone, Mail, Building2, FileText, Clock } from 'lucide-react'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/features/shared/ui/alert-dialog'
import type { BusinessEntity } from '../../types/business-entity.types'

export interface ClientOriginOption {
	value: string
	label: string
}

interface BusinessViewModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	business: BusinessEntity | null
	isLoading?: boolean
	/** When true and business.status === 'EMITIDO', show inline select to change client origin */
	allowEditOrigin?: boolean
	/** Options for the origin select (required when allowEditOrigin) */
	clientOriginsOptions?: ClientOriginOption[]
	/** Called when user saves a new origin from the modal */
	onSaveOrigin?: (businessId: number, idClientOrigin: number) => Promise<void>
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
const EMITIDO = 'EMITIDO'

export function BusinessViewModal({
	open,
	onOpenChange,
	business,
	isLoading,
	allowEditOrigin = false,
	clientOriginsOptions = [],
	onSaveOrigin,
}: BusinessViewModalProps) {
	const [isEditingOrigin, setIsEditingOrigin] = useState(false)
	const [selectedOriginId, setSelectedOriginId] = useState<string>('')
	const [isSavingOrigin, setIsSavingOrigin] = useState(false)
	const [isAlertOpen, setIsAlertOpen] = useState(false)

	const handleConfirmOriginChange = async () => {
		if (!onSaveOrigin || !business || !hasOriginChanged) return
		setIsSavingOrigin(true)
		try {
			await onSaveOrigin(business.id, Number(selectedOriginId))
			setSelectedOriginId('')
			setIsEditingOrigin(false)
			setIsAlertOpen(false)
		} catch (err: unknown) {
			const message =
				err instanceof Error
					? err.message
					: 'Error al actualizar el origen del negocio'
			toast.error(message)
		} finally {
			setIsSavingOrigin(false)
		}
	}

	const canEditOrigin =
		allowEditOrigin &&
		business?.status === EMITIDO &&
		clientOriginsOptions.length > 0 &&
		typeof onSaveOrigin === 'function'

	const currentOriginValue =
		business?.clientOrigin?.id != null
			? String(business.clientOrigin.id)
			: ''

	const displayOriginValue = selectedOriginId || currentOriginValue
	const hasOriginChanged =
		selectedOriginId !== '' && selectedOriginId !== currentOriginValue
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
							label="Plazo de producto en años"
							value={business.term ? `${business.term}` : '-'}
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

				{/* Información del Money Strategist */}
				<section className="space-y-3">
					<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
						Money Strategist Responsable
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
				<section className="space-y-3 pt-4 border-t">
					<div className="flex justify-between items-start gap-4 flex-wrap">
						<div className="space-y-1">
							<span className="text-sm text-muted-foreground">Origen</span>
							{isEditingOrigin && canEditOrigin ? (
								<Select
									value={displayOriginValue}
									onValueChange={setSelectedOriginId}
									disabled={isSavingOrigin}
								>
									<SelectTrigger className="w-[200px]">
										<SelectValue placeholder="Seleccione origen" />
									</SelectTrigger>
									<SelectContent>
										{clientOriginsOptions.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<p className="font-medium">{business.clientOrigin.name}</p>
							)}
						</div>
						<span className="text-sm text-muted-foreground">
							Registrado:{' '}
							{new Date(business.createdAt).toLocaleDateString('es-CO')}
						</span>
					</div>
				</section>

				{/* Footer: Editar origen (si EMITIDO y no editando) o Guardar (si editando) + Cerrar */}
				<div className="flex justify-end gap-2 pt-4">
					{isEditingOrigin && canEditOrigin ? (
						<Button
							variant="default"
							disabled={!hasOriginChanged || isSavingOrigin}
							onClick={() => setIsAlertOpen(true)}
							className="cursor-pointer"
						>
							{isSavingOrigin ? 'Guardando…' : 'Guardar'}
						</Button>
					) : (
						canEditOrigin && (
							<Button
								variant="outline"
								onClick={() => setIsEditingOrigin(true)}
								className="cursor-pointer"
							>
								Editar origen
							</Button>
						)
					)}
					<Button
						variant="outline"
						onClick={() => {
							setIsEditingOrigin(false)
							setSelectedOriginId('')
							onOpenChange(false)
						}}
					>
						Cerrar
					</Button>
				</div>
			</div>

			<AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Confirmar cambio de origen?</AlertDialogTitle>
						<AlertDialogDescription>
							Al cambiar el origen de un negocio Emitido, <strong className="text-foreground">las comisiones van a ser recalculadas</strong> acorde a la nueva configuración de distribución.
							<br /><br />
							Se mantendrán los descuentos y clawbacks actuales. Esta acción no se puede deshacer.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isSavingOrigin}>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={(e) => {
							e.preventDefault()
							handleConfirmOriginChange()
						}} disabled={isSavingOrigin}>
							{isSavingOrigin ? 'Recalculando...' : 'Sí, continuar'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
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

			{/* Información del Money Strategist */}
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
