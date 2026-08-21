import { PrismaClient } from '@prisma/client'

const FALLBACK_COLUMN = {
	name: 'Sin mapear',
	externalStatusKey: '__unmapped__',
	position: 0,
	isFallback: true,
}

/**
 * Real business funnel steps (name shown to admins → `externalStatusKey`
 * contract that n8n/CRM must send in the webhook's `statusKey` field).
 * Order here defines `position` (1..N, right after the fixed "Sin mapear"
 * column at position 0).
 */
const BUSINESS_COLUMNS: { name: string; externalStatusKey: string }[] = [
	{ name: 'Lead Nuevo', externalStatusKey: 'NUEVO_LEAD' },
	{ name: 'Contacto 1ra Vez', externalStatusKey: 'PRIMER_CONTACTO' },
	{ name: 'Contacto 2ra Vez', externalStatusKey: 'SEGUNDO_CONTACTO' },
	{ name: 'Contacto 3ra Vez', externalStatusKey: 'TERCER_CONTACTO' },
	{ name: 'Contacto 4ra Vez', externalStatusKey: 'CUARTO_CONTACTO' },
	{ name: 'Contacto 5ra Vez', externalStatusKey: 'QUINTO_CONTACTO' },
	{ name: 'Diagnostico Agendado', externalStatusKey: 'DIAGNOSTICO_AGENDADO' },
	{ name: 'Asistió al diagnostico', externalStatusKey: 'ASISTIO_AL_DIAGNOSTICO' },
	{ name: 'No asistió al diagnostico', externalStatusKey: 'NO_ASISTIO_AL_DIAGNOSTICO' },
	{ name: 'Reagendamiento', externalStatusKey: 'REAGENDAMIENTO' },
	{ name: 'Pendiente Tareas', externalStatusKey: 'PENDIENTE_TAREAS' },
	{ name: 'Tareas recibidas', externalStatusKey: 'TAREAS_RECIBIDAS' },
	{ name: 'Estructurando propuesta', externalStatusKey: 'ESTRUCTURANDO_PROPUESTA' },
	{ name: 'Cita de propuesta agendada', externalStatusKey: 'CITA_PROPUESTA_AGENDADA' },
	{ name: 'Asistió a la cita de propuesta', externalStatusKey: 'ASISTIO_CITA_PROPUESTA' },
	{ name: 'No asistió a la cita de propuesta', externalStatusKey: 'NO_ASISTIO_CITA_PROPUESTA' },
	{ name: 'Propuestas Aceptadas', externalStatusKey: 'PROPUESTA_ACEPTADA' },
	{ name: 'Seguimiento', externalStatusKey: 'SEGUIMIENTO' },
	{ name: 'Negocio aplazado', externalStatusKey: 'NEGOCIO_APLAZADO' },
	{ name: 'En acompañamiento', externalStatusKey: 'EN_ACOMPANAMIENTO' },
	{ name: 'Cierre', externalStatusKey: 'CIERRE' },
	{ name: 'Won', externalStatusKey: 'WON' },
]

/**
 * Idempotent seed for `LeadFunnelColumn`: the fixed "Sin mapear" fallback
 * (position 0) plus the real business funnel steps (position 1..N, in the
 * order the business defined them). Safe to re-run in any environment
 * (dev/QA/prod) — upserts by the unique `externalStatusKey`, never
 * duplicates or reorders columns that already exist with a different name
 * a human may have renamed since (name/position always sync to this seed's
 * canonical definition; `externalStatusKey` itself never changes on an
 * existing row, consistent with it being immutable after creation).
 */
export async function seedLeadFunnelColumns(prisma: PrismaClient) {
	console.log('\n👉 Procesando columnas de embudo de Leads (LeadFunnelColumn)...')

	await prisma.leadFunnelColumn.upsert({
		where: { externalStatusKey: FALLBACK_COLUMN.externalStatusKey },
		update: {
			name: FALLBACK_COLUMN.name,
			isFallback: true,
			active: true,
		},
		create: FALLBACK_COLUMN,
	})
	console.log(`✅ Columna "Sin mapear" asegurada (externalStatusKey: ${FALLBACK_COLUMN.externalStatusKey})`)

	for (const [index, column] of BUSINESS_COLUMNS.entries()) {
		const position = index + 1
		await prisma.leadFunnelColumn.upsert({
			where: { externalStatusKey: column.externalStatusKey },
			update: {
				name: column.name,
				position,
				active: true,
			},
			create: {
				name: column.name,
				externalStatusKey: column.externalStatusKey,
				position,
				isFallback: false,
			},
		})
	}
	console.log(`✅ ${BUSINESS_COLUMNS.length} columnas del funnel de negocio aseguradas`)
}
