import { auth } from '@/auth'
import { notFound, redirect } from 'next/navigation'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { getBusinessById } from '@/features/negocios/services/business-get-by-id.server'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { BusinessStatusBadge } from '@/features/negocios/components/ui/BusinessStatusBadge'
import { BusinessNovedadBadge } from '@/features/negocios/components/ui/BusinessNovedadBadge'
import { NovedadActionButton } from '@/features/negocios/components/ui/NovedadActionButton'
import { UserAvatar } from '@/features/negocios/components/ui/UserAvatar'
import { formatCurrency } from '@/features/admin/currencies/lib/currency-formatters'
import { Calendar, Phone, Mail, Building2, FileText, Clock, Layers, Edit } from 'lucide-react'
import { formatDateBogota } from '@/features/shared/lib/format-date'
import { ViewSupportsButton } from '@/features/business-supports/components/ViewSupportsButton'
import { UploadSupportButton } from '@/features/business-supports/components/UploadSupportButton'
import { CommentsSidebar } from '@/features/comments/components/CommentsSidebar'
import { UserRole } from '@/features/auth/lib/roles'
import Link from 'next/link'
import { buttonVariants } from '@/features/shared/ui/button'

interface PageProps {
	params: Promise<{ id: string }>
	searchParams: Promise<{ openComments?: string }>
}

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

export default async function DetalleNegocioPage({ params, searchParams }: PageProps) {
	const { id } = await params
	const { openComments } = await searchParams
	const session = await auth()

	if (!session?.user?.email) {
		redirect('/login')
	}

	const businessId = parseInt(id, 10)
	if (isNaN(businessId)) {
		notFound()
	}

	const currentUser = await getCurrentUserByEmail(session.user.email)
	if (!currentUser) {
		redirect('/login')
	}

	const prismaBusiness = await getBusinessById(businessId, currentUser)
	if (!prismaBusiness) {
		notFound()
	}

	const business = prismaBusinessToEntity(prismaBusiness)

	return (
		<DashboardLayout currentPage={`Negocio #${business.id}`}>
			<div className="bg-background rounded-xl p-6 shadow-sm border max-w-4xl mx-auto w-full space-y-8 mt-4">
				{/* Header con estado, valor y acciones */}
				<div className="flex flex-col gap-4 pb-6 border-b">
					<div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
						<div className="flex flex-col gap-2 min-w-0">
							<div className="flex flex-wrap items-center gap-2">
								<BusinessStatusBadge status={business.status} />
								<BusinessNovedadBadge novedadStatus={business.novedadStatus} variant="detailed" />
							</div>
							<span className="text-sm text-muted-foreground">
								Registrado: {formatDateBogota(business.createdAt)}
							</span>
							{business.novedadStatus && (
								<span className="text-sm text-muted-foreground">
									Fecha de Novedad:{' '}
									<span className="font-medium text-foreground">
										{formatDateBogota(business.novedadMarkedAt)}
									</span>
								</span>
							)}
						</div>
						<span className="text-3xl font-bold text-primary shrink-0">
							{formatCurrency(business.value, business.currency.name)}
						</span>
					</div>

					<div className="flex flex-wrap items-center justify-end gap-2">
						<NovedadActionButton
							businessId={business.id}
							businessStatus={business.status}
							novedadStatus={business.novedadStatus}
						/>
						<UploadSupportButton businessId={business.id} />
						<Link
							href={`/dashboard/negocios/editar/${business.id}`}
							className={buttonVariants({
								variant: 'outline',
								size: 'sm',
								className: 'gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800',
							})}
						>
							<Edit className="h-3.5 w-3.5" />
							Editar
						</Link>
						<ViewSupportsButton
							businessId={business.id}
							userRole={currentUser.role?.name as UserRole}
						/>
						<CommentsSidebar
							businessId={business.id}
							authorName={currentUser.name}
							authorEmail={currentUser.email}
							contract={business.contract || `Negocio #${business.id}`}
							defaultOpen={openComments === 'true'}
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{/* Información del Cliente */}
					<section className="space-y-4">
						<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
							Cliente
						</h3>
						<div className="flex items-start gap-4">
							<UserAvatar name={business.client.fullName} size="lg" />
							<div className="flex-1 space-y-2">
								<p className="font-semibold text-lg">{business.client.fullName}</p>
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

					{/* Información del Money Strategist */}
					<section className="space-y-4">
						<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
							Agente Responsable
						</h3>
						<div className="flex items-start gap-4">
							<UserAvatar name={business.agent.fullName} size="md" />
							<div className="flex-1 space-y-2">
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
				</div>

				{/* Información del Producto */}
				<section className="space-y-4">
					<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
						Detalles del Producto
					</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-muted/20 p-4 rounded-lg">
						<InfoItem label="Producto" value={business.product.name} />
						<InfoItem
							label="Compañía"
							value={business.product.companyName}
							icon={<Building2 className="h-4 w-4" />}
						/>
						<InfoItem
							label="Plazo en años"
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
							className="col-span-2 md:col-span-4"
						/>
					</div>
				</section>

				{/* Origen y Fecha */}
				<section className="space-y-4 pt-4 border-t">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="space-y-1">
							<span className="text-sm text-muted-foreground block">Origen</span>
							<p className="font-medium">{business.clientOrigin.name}</p>
						</div>

						<div className="space-y-1">
							<span className="text-sm text-muted-foreground block">Fecha de Emisión</span>
							<p className="font-medium">
								{business.dateIssued
									? formatDateBogota(business.dateIssued)
									: 'Sin registrar'}
							</p>
						</div>

						{business.numAportes != null && (
							<div className="space-y-1">
								<span className="text-sm text-muted-foreground block">Aportes</span>
								<p className="font-medium flex items-center gap-2">
									<Layers className="h-4 w-4" />
									{business.fundedAportes ?? 0} de {business.numAportes}
								</p>
							</div>
						)}
					</div>
				</section>
			</div>
		</DashboardLayout>
	)
}
