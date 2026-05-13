'use client'

import { FileText, User, Calendar, Hash, Receipt } from 'lucide-react'
import type { ReciboMensualDistribucion } from '../types/types'
import {
	formatCurrency,
	formatDate,
	formatPeriodo,
} from '../lib/format-utils'

interface ReciboDistribucionProps {
	recibo: ReciboMensualDistribucion
}

function EstadoBadge({ estado }: { estado: string }) {
	const normalized = estado.toUpperCase()
	if (normalized === 'SETTLED' || normalized === 'COMPLETED') {
		return (
			<span className="truncate inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
				<Receipt className="h-3 w-3" />
				Comprobante de liquidación
			</span>
		)
	}
	if (normalized === 'PRE-SETTLED') {
		return (
			<span className="truncate inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
				En revisión
			</span>
		)
	}
	return (
		<span className="truncate inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
			{estado}
		</span>
	)
}

function StatCard({
	label,
	value,
	tone = 'default',
}: {
	label: string
	value: string
	tone?: 'default' | 'positive' | 'negative' | 'accent'
}) {
	const toneClasses =
		tone === 'positive'
			? 'text-emerald-700'
			: tone === 'negative'
				? 'text-destructive'
				: tone === 'accent'
					? 'text-primary'
					: 'text-foreground'
	return (
		<div className="rounded-lg border border-border bg-card p-4 shadow-sm">
			<p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
				{label}
			</p>
			<p className={`text-lg font-bold tabular-nums ${toneClasses}`}>
				{value}
			</p>
		</div>
	)
}

/**
 * Receipt-style header + totals for a monthly distribution receipt.
 *
 * Layout:
 * - Encabezado con beneficiario, archivo y periodo.
 * - Badge de estado (En revisión / Comprobante de liquidación).
 * - Tarjetas de totales: bruta, descuentos, clawback, neta y # contratos.
 */
export function ReciboDistribucion({ recibo }: ReciboDistribucionProps) {
	const { beneficiario, archivo, totales } = recibo
	return (
		<div className="space-y-6">
			<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
				<div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
					<div className="space-y-3">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-primary/10 p-2">
								<Receipt className="h-5 w-5 text-primary" />
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Recibo de distribución
								</p>
								<h2 className="text-xl font-semibold text-foreground">
									{formatPeriodo(archivo.periodo)}
								</h2>
							</div>
							<EstadoBadge estado={archivo.estado} />
						</div>

						<dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
							<div className="flex items-start gap-2">
								<User className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
								<div>
									<dt className="text-xs text-muted-foreground">
										Beneficiario
									</dt>
									<dd className="font-medium text-foreground">
										{beneficiario.nombreCompleto}
									</dd>
								</div>
							</div>
							{beneficiario.identityNumber && (
								<div className="flex items-start gap-2">
									<Hash className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
									<div>
										<dt className="text-xs text-muted-foreground">
											{beneficiario.typeIdentity ?? 'Identificación'}
										</dt>
										<dd className="font-medium text-foreground tabular-nums">
											{beneficiario.identityNumber}
										</dd>
									</div>
								</div>
							)}
							<div className="flex items-start gap-2">
								<FileText className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
								<div>
									<dt className="text-xs text-muted-foreground">
										Archivo
									</dt>
									<dd
										className="font-medium text-foreground truncate"
										title={archivo.nombreArchivo}
									>
										{archivo.nombreArchivo}
									</dd>
								</div>
							</div>
							<div className="flex items-start gap-2">
								<Calendar className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
								<div>
									<dt className="text-xs text-muted-foreground">
										Fechas
									</dt>
									<dd className="font-medium text-foreground">
										Pre-liquidación:{' '}
										{formatDate(archivo.fechaPreLiquidacion)}
										{archivo.fechaLiquidacion && (
											<>
												{' · '}
												Liquidación: {formatDate(archivo.fechaLiquidacion)}
											</>
										)}
									</dd>
								</div>
							</div>
						</dl>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
				<StatCard
					label="Total Bruta"
					value={formatCurrency(totales.totalBruta)}
				/>
				<StatCard
					label="Descuentos"
					value={formatCurrency(totales.totalDescuento)}
					tone="negative"
				/>
				<StatCard
					label="Clawback"
					value={formatCurrency(totales.totalClawback)}
					tone="negative"
				/>
				<StatCard
					label="Total Neta"
					value={formatCurrency(totales.totalNeta)}
					tone="accent"
				/>
				<StatCard
					label="Contratos"
					value={`${totales.countContratos} (${totales.countNegocios} negocios)`}
				/>
			</div>
		</div>
	)
}
