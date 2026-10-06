'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Label } from '@/features/shared/ui/label'
import { Badge } from '@/features/shared/ui/badge'
import { useLeadCsvImport } from '@/features/leads/hooks/use-lead-csv-import'
import type { LeadCsvOwnerlessLead } from '@/features/leads/types/lead-csv-import.types'

/**
 * Renders a DISTINCT Spanish label per `LeadCsvOwnerlessReason` — the four
 * reasons a row can end up without an assigned owner are never collapsed
 * into one generic message (per Amendment A).
 */
function describeOwnerlessReason(lead: LeadCsvOwnerlessLead): string {
	switch (lead.reason) {
		case 'EMAIL_UNMATCHED':
			return `correo no encontrado: ${lead.ownerEmail}`
		case 'NAME_UNMATCHED':
			return `nombre no encontrado: ${lead.ownerName}`
		case 'NAME_AMBIGUOUS':
			return `nombre ambiguo: ${lead.ownerName} (${lead.candidateCount} coincidencias)`
		case 'NO_OWNER_PROVIDED':
			return 'sin propietario indicado en el archivo'
	}
}

/**
 * CSV import entry point on `/admin/lead-funnel-columns`: template download
 * link, file upload input, and a results summary panel distinguishing
 * successfully imported rows from rejected rows, ownerless leads, and
 * WON-locked leads (never merged into one undifferentiated list).
 */
export function LeadCsvImportPanel() {
	const { state, importFile } = useLeadCsvImport()

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (file) {
			importFile(file)
		}
		event.target.value = ''
	}

	return (
		<Card data-testid="lead-csv-import-panel">
			<CardHeader>
				<CardTitle className="text-base">Importar leads desde CSV</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
					<a
						href="/api/leads/csv-template"
						download
						className="text-sm font-medium text-primary underline-offset-4 hover:underline"
					>
						Descargar plantilla
					</a>

					<div className="flex flex-1 flex-col gap-1.5">
						<Label htmlFor="lead-csv-import-file">Subir archivo CSV</Label>
						<input
							id="lead-csv-import-file"
							type="file"
							accept=".csv,text/csv"
							onChange={handleFileChange}
							disabled={state.status === 'loading'}
							className="text-sm"
						/>
					</div>
				</div>

				{state.status === 'loading' && (
					<p className="text-sm text-slate-600 dark:text-slate-300">Importando…</p>
				)}

				{state.status === 'error' && (
					<p className="text-sm text-destructive">{state.error}</p>
				)}

				{state.status === 'success' && (
					<div className="space-y-4" data-testid="lead-csv-import-summary">
						<p className="text-sm font-medium">
							{state.data.imported} importados de {state.data.totalRows} filas ({state.data.created}{' '}
							creados, {state.data.updated} actualizados)
						</p>

						{state.data.rejected.length > 0 && (
							<div className="space-y-1">
								<p className="text-sm font-semibold">Filas rechazadas</p>
								<ul className="space-y-1 text-sm text-destructive">
									{state.data.rejected.map((row) => (
										<li key={row.rowNumber}>
											Fila {row.rowNumber}: {row.reason}
										</li>
									))}
								</ul>
							</div>
						)}

						{state.data.ownerlessLeads.length > 0 && (
							<div className="space-y-1">
								<p className="text-sm font-semibold">Leads sin propietario</p>
								<ul className="space-y-1 text-sm">
									{state.data.ownerlessLeads.map((lead) => (
										<li key={lead.rowNumber}>
											<Badge variant="neutral">Sin propietario</Badge>{' '}
											{lead.externalCrmId} ({describeOwnerlessReason(lead)})
										</li>
									))}
								</ul>
							</div>
						)}

						{state.data.wonLockedLeads.length > 0 && (
							<div className="space-y-1">
								<p className="text-sm font-semibold">Leads bloqueados por estado Ganado</p>
								<ul className="space-y-1 text-sm">
									{state.data.wonLockedLeads.map((lead) => (
										<li key={lead.rowNumber}>
											<Badge variant="success">Ganado (bloqueado)</Badge> {lead.externalCrmId}{' '}
											(intento: {lead.attemptedStatus})
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
