import { redirect } from 'next/navigation'
import { 
	FileText, 
	TrendingUp, 
	FileCheck, 
	DollarSign, 
	PiggyBank,
	ArrowUpRight,
	ArrowDownRight
} from 'lucide-react'
import { auth } from '@/auth'
import { UserRole } from '@/features/auth/lib/roles'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { getAgentDashboardStats } from '@/features/shared/services/agent.service'

/**
 * Dashboard de Agente
 *
 * Muestra estadísticas personales del agente:
 * - Total negocios del mes
 * - Resumen de negocios "Venta Efectuada"
 * - Resumen de negocios "Emitidos"
 */
export default async function AgenteDashboardPage() {
	const session = await auth()

	// Verificar autenticación
	if (!session?.user) {
		redirect('/login')
	}

	// Verificar que el usuario es un agente
	if (session.user.role !== UserRole.AGENTE) {
		redirect('/dashboard')
	}

	const userId = parseInt(session.user.id || '0')

	if (!userId) {
		redirect('/login')
	}

	// Obtener estadísticas del agente a través del servicio
	const stats = await getAgentDashboardStats(userId)

	return (
		<DashboardLayout currentPage="Mi Dashboard">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">Mi Dashboard</h1>
					<p className="text-muted-foreground">
						Estadísticas personales de tu actividad
					</p>
				</div>

				<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
					{/* Total Negocios */}
					<div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-5 shadow-lg text-white transition-all hover:scale-[1.02] hover:shadow-indigo-500/25 border border-white/10 flex flex-col justify-between overflow-hidden">
						<div className="flex items-center justify-between gap-2">
							<div className="space-y-1 min-w-0">
								<p className="text-sm font-medium text-white/80 truncate">
									Negocios del Mes
								</p>
								<p className="text-2xl md:text-3xl font-bold tracking-tight">{stats.totalNegocios}</p>
							</div>
							<div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm shrink-0">
								<FileText className="h-6 w-6 text-white" />
							</div>
						</div>
						<div className="mt-4 flex items-center gap-1 text-xs">
							{stats.trends.totalNegocios >= 0 ? (
								<ArrowUpRight className="h-4 w-4 text-emerald-300" />
							) : (
								<ArrowDownRight className="h-4 w-4 text-rose-300" />
							)}
							<span className={stats.trends.totalNegocios >= 0 ? "text-emerald-300 font-medium" : "text-rose-300 font-medium"}>
								{Math.abs(stats.trends.totalNegocios)}%
							</span>
							<span className="text-white/60">vs mes anterior</span>
						</div>
					</div>

					{/* Ventas Efectuadas */}
					<div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-5 shadow-lg text-white transition-all hover:scale-[1.02] hover:shadow-green-500/25 border border-white/10 flex flex-col justify-between overflow-hidden">
						<div className="flex items-center justify-between gap-2">
							<div className="space-y-1 min-w-0">
								<p className="text-sm font-medium text-white/80 truncate">
									Ventas Efectuadas
								</p>
								<p className="text-2xl md:text-3xl font-bold tracking-tight">{stats.ventasEfectuadas}</p>
							</div>
							<div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm shrink-0">
								<TrendingUp className="h-6 w-6 text-white" />
							</div>
						</div>
						<div className="mt-4 flex items-center gap-1 text-xs">
							{stats.trends.ventasEfectuadas >= 0 ? (
								<ArrowUpRight className="h-4 w-4 text-emerald-100" />
							) : (
								<ArrowDownRight className="h-4 w-4 text-rose-200" />
							)}
							<span className={stats.trends.ventasEfectuadas >= 0 ? "text-emerald-100 font-medium" : "text-rose-200 font-medium"}>
								{Math.abs(stats.trends.ventasEfectuadas)}%
							</span>
							<span className="text-white/60">vs mes anterior</span>
						</div>
					</div>

					{/* Negocios Emitidos */}
					<div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 shadow-lg text-white transition-all hover:scale-[1.02] hover:shadow-blue-500/25 border border-white/10 flex flex-col justify-between overflow-hidden">
						<div className="flex items-center justify-between gap-2">
							<div className="space-y-1 min-w-0">
								<p className="text-sm font-medium text-white/80 truncate">
									Negocios Emitidos
								</p>
								<p className="text-2xl md:text-3xl font-bold tracking-tight">{stats.negociosEmitidos}</p>
							</div>
							<div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm shrink-0">
								<FileCheck className="h-6 w-6 text-white" />
							</div>
						</div>
						<div className="mt-4 flex items-center gap-1 text-xs">
							{stats.trends.negociosEmitidos >= 0 ? (
								<ArrowUpRight className="h-4 w-4 text-emerald-100" />
							) : (
								<ArrowDownRight className="h-4 w-4 text-rose-200" />
							)}
							<span className={stats.trends.negociosEmitidos >= 0 ? "text-emerald-100 font-medium" : "text-rose-200 font-medium"}>
								{Math.abs(stats.trends.negociosEmitidos)}%
							</span>
							<span className="text-white/60">vs mes anterior</span>
						</div>
					</div>

					{/* Valor Total */}
					<div className="rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 p-5 shadow-lg text-white transition-all hover:scale-[1.02] hover:shadow-teal-500/25 border border-white/10 flex flex-col justify-between overflow-hidden">
						<div className="flex items-center justify-between gap-2">
							<div className="space-y-1 min-w-0">
								<p className="text-sm font-medium text-white/80 truncate">
									Valor Total del Mes
								</p>
								<p className="text-2xl md:text-3xl font-bold tracking-tight truncate">
									$
									{stats.valorTotal.toLocaleString('es-CO', {
										maximumFractionDigits: 0,
									})}
								</p>
							</div>
							<div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm shrink-0">
								<DollarSign className="h-6 w-6 text-white" />
							</div>
						</div>
						<div className="mt-4 flex items-center gap-1 text-xs">
							{stats.trends.valorTotal >= 0 ? (
								<ArrowUpRight className="h-4 w-4 text-emerald-100" />
							) : (
								<ArrowDownRight className="h-4 w-4 text-rose-200" />
							)}
							<span className={stats.trends.valorTotal >= 0 ? "text-emerald-100 font-medium" : "text-rose-200 font-medium"}>
								{Math.abs(stats.trends.valorTotal)}%
							</span>
							<span className="text-white/60">vs mes anterior</span>
						</div>
					</div>

					{/* Reserva de Clawback */}
					<div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 shadow-lg text-white transition-all hover:scale-[1.02] hover:shadow-amber-500/25 border border-white/10 flex flex-col justify-between overflow-hidden">
						<div className="flex items-center justify-between gap-2">
							<div className="space-y-1 min-w-0">
								<p className="text-sm font-medium text-white/80 truncate">
									Reserva de Clawback
								</p>
								<p className="text-2xl md:text-3xl font-bold tracking-tight truncate">
									$
									{stats.clawbackBalance.toLocaleString('es-CO', {
										maximumFractionDigits: 0,
									})}
								</p>
							</div>
							<div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm shrink-0">
								<PiggyBank className="h-6 w-6 text-white" />
							</div>
						</div>
						<div className="mt-4 flex items-center gap-1 text-xs">
							<span className="text-white/80 font-medium">Saldo acumulado</span>
						</div>
					</div>
				</div>


				<div className="grid gap-4 md:grid-cols-2">
					<div className="rounded-lg border bg-card p-6">
						<h3 className="mb-4 text-lg font-semibold">
							Resumen de Ventas Efectuadas
						</h3>
						<p className="text-sm text-muted-foreground">
							Total de negocios con estado &quot;Venta Efectuada&quot; en el mes
							actual.
						</p>
						<div className="mt-4">
							<p className="text-3xl font-bold">{stats.ventasEfectuadas}</p>
						</div>
					</div>

					<div className="rounded-lg border bg-card p-6">
						<h3 className="mb-4 text-lg font-semibold">
							Resumen de Negocios Emitidos
						</h3>
						<p className="text-sm text-muted-foreground">
							Total de negocios con estado &quot;Emitido&quot; en el mes actual.
						</p>
						<div className="mt-4">
							<p className="text-3xl font-bold">{stats.negociosEmitidos}</p>
						</div>
					</div>
				</div>
			</div>
		</DashboardLayout>
	)
}
