/**
 * Demo leads that do not come from GoHighLevel.
 *
 * `externalCrmId` and `externalUrl` stay null, so the detail sheet does not
 * show "Gestionado en GHL". Notes, tasks, tags, estimated value, probability
 * and stage history are CRM-owned.
 *
 * Idempotent: matched by the demo email. Safe to re-run.
 * Uses `.env.local` (the database `npm run dev` reads).
 *
 *   npm run prisma:seed:crm-demo
 */
import { config } from 'dotenv'

config({ path: '.env.local', override: true })

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
/** America/Bogota is UTC-5 all year. */
const BOGOTA_OFFSET_MS = 5 * HOUR_MS
const EMAIL_DOMAIN = 'financieramente.demo'
/** Dedicated owner. Never a real advisor: demo tasks must not land on someone who already works leads. */
const DEMO_OWNER_EMAIL = `asesor.demo@${EMAIL_DOMAIN}`

type Outcome = 'OPEN' | 'WON' | 'LOST'
type TaskType = 'TODO' | 'CALL' | 'MEETING' | 'EMAIL' | 'WHATSAPP'
type TaskStatus = 'OPEN' | 'DONE'

interface DemoTask {
	title: string
	type: TaskType
	/** Hours from the start of today in Bogotá. Null stays in Próximas. */
	dueOffsetHours: number | null
	status: TaskStatus
}

interface DemoHistory {
	fromKey: string | null
	toKey: string
	daysAgo: number
}

interface DemoLead {
	slug: string
	name: string
	lastName: string
	phone: string
	identityNumber: string
	originTag: string
	columnKey: string
	outcome: Outcome
	estimatedValue: string
	probability: number
	daysAgoCreated: number
	/** When true, last contact stays old enough for the inactivity badge. */
	idle: boolean
	product: string
	budget: number
	tags: string[]
	note: string
	callSummary?: string
	history: DemoHistory[]
	tasks: DemoTask[]
	supportSubject?: string
}

const TAGS: { name: string; color: string }[] = [
	{ name: 'Prioridad alta', color: '#b45309' },
	{ name: 'Referido interno', color: '#0f766e' },
]

const DEMO_LEADS: DemoLead[] = [
	{
		slug: 'camila',
		name: 'Demo Camila',
		lastName: 'Herrera',
		phone: '3001000001',
		identityNumber: '1001000001',
		originTag: 'Referido',
		columnKey: 'NUEVO_LEAD',
		outcome: 'OPEN',
		estimatedValue: '8000000',
		probability: 20,
		daysAgoCreated: 8,
		idle: true,
		product: 'Ahorro',
		budget: 8000000,
		tags: ['Prioridad alta'],
		note: 'Llegó por referido de un cliente. Nadie lo ha contactado esta semana.',
		history: [{ fromKey: null, toKey: 'NUEVO_LEAD', daysAgo: 8 }],
		tasks: [{ title: 'Hacer el primer contacto', type: 'CALL', dueOffsetHours: -30, status: 'OPEN' }],
	},
	{
		slug: 'santiago',
		name: 'Demo Santiago',
		lastName: 'Morales',
		phone: '3001000002',
		identityNumber: '1001000002',
		originTag: 'Web',
		columnKey: 'PRIMER_CONTACTO',
		outcome: 'OPEN',
		estimatedValue: '12000000',
		probability: 40,
		daysAgoCreated: 6,
		idle: false,
		product: 'Protección',
		budget: 12000000,
		tags: ['Referido interno'],
		note: 'Pidió que lo llamemos en la tarde para cuadrar el diagnóstico.',
		callSummary: 'Contestó. Quiere diagnóstico esta semana.',
		history: [
			{ fromKey: null, toKey: 'NUEVO_LEAD', daysAgo: 6 },
			{ fromKey: 'NUEVO_LEAD', toKey: 'PRIMER_CONTACTO', daysAgo: 2 },
		],
		tasks: [{ title: 'Llamar para confirmar el diagnóstico', type: 'CALL', dueOffsetHours: 15, status: 'OPEN' }],
	},
	{
		slug: 'valentina',
		name: 'Demo Valentina',
		lastName: 'Rojas',
		phone: '3001000003',
		identityNumber: '1001000003',
		originTag: 'Instagram',
		columnKey: 'DIAGNOSTICO_AGENDADO',
		outcome: 'OPEN',
		estimatedValue: '25000000',
		probability: 60,
		daysAgoCreated: 5,
		idle: false,
		product: 'Inversión',
		budget: 25000000,
		tags: ['Prioridad alta', 'Referido interno'],
		note: 'Diagnóstico agendado. Llevar el flujo de caja que envió por WhatsApp.',
		history: [
			{ fromKey: null, toKey: 'NUEVO_LEAD', daysAgo: 5 },
			{ fromKey: 'NUEVO_LEAD', toKey: 'PRIMER_CONTACTO', daysAgo: 4 },
			{ fromKey: 'PRIMER_CONTACTO', toKey: 'DIAGNOSTICO_AGENDADO', daysAgo: 1 },
		],
		tasks: [{ title: 'Reunión de diagnóstico', type: 'MEETING', dueOffsetHours: 50, status: 'OPEN' }],
	},
	{
		slug: 'mateo',
		name: 'Demo Mateo',
		lastName: 'Castillo',
		phone: '3001000004',
		identityNumber: '1001000004',
		originTag: 'Referido',
		columnKey: 'ESTRUCTURANDO_PROPUESTA',
		outcome: 'OPEN',
		estimatedValue: '40000000',
		probability: 70,
		daysAgoCreated: 8,
		idle: true,
		product: 'Inversión',
		budget: 40000000,
		tags: ['Prioridad alta'],
		note: 'La propuesta quedó a medias. Lleva más de una semana sin movimiento.',
		history: [
			{ fromKey: null, toKey: 'NUEVO_LEAD', daysAgo: 8 },
			{ fromKey: 'NUEVO_LEAD', toKey: 'DIAGNOSTICO_AGENDADO', daysAgo: 6 },
			{ fromKey: 'DIAGNOSTICO_AGENDADO', toKey: 'ESTRUCTURANDO_PROPUESTA', daysAgo: 4 },
		],
		tasks: [{ title: 'Cerrar el borrador de la propuesta', type: 'TODO', dueOffsetHours: null, status: 'OPEN' }],
	},
	{
		slug: 'laura',
		name: 'Demo Laura',
		lastName: 'Gómez',
		phone: '3001000005',
		identityNumber: '1001000005',
		originTag: 'Web',
		columnKey: 'SEGUIMIENTO',
		outcome: 'OPEN',
		estimatedValue: '15000000',
		probability: 50,
		daysAgoCreated: 4,
		idle: false,
		product: 'Protección',
		budget: 15000000,
		tags: ['Referido interno'],
		note: 'Quedó en pensarlo con su pareja y responder esta semana.',
		history: [
			{ fromKey: null, toKey: 'NUEVO_LEAD', daysAgo: 4 },
			{ fromKey: 'NUEVO_LEAD', toKey: 'SEGUIMIENTO', daysAgo: 1 },
		],
		tasks: [{ title: 'Seguimiento por WhatsApp', type: 'WHATSAPP', dueOffsetHours: -20, status: 'DONE' }],
	},
	{
		slug: 'julian',
		name: 'Demo Julián',
		lastName: 'Pérez',
		phone: '3001000006',
		identityNumber: '1001000006',
		originTag: 'Referido',
		columnKey: 'CIERRE',
		outcome: 'OPEN',
		estimatedValue: '60000000',
		probability: 80,
		daysAgoCreated: 7,
		idle: false,
		product: 'Inversión',
		budget: 60000000,
		tags: ['Prioridad alta'],
		note: 'Aceptó las condiciones. Falta el soporte de ingresos para cerrar.',
		history: [
			{ fromKey: null, toKey: 'NUEVO_LEAD', daysAgo: 7 },
			{ fromKey: 'NUEVO_LEAD', toKey: 'ESTRUCTURANDO_PROPUESTA', daysAgo: 3 },
			{ fromKey: 'ESTRUCTURANDO_PROPUESTA', toKey: 'CIERRE', daysAgo: 1 },
		],
		tasks: [{ title: 'Enviar la propuesta revisada', type: 'EMAIL', dueOffsetHours: -6, status: 'OPEN' }],
		supportSubject: 'Faltan soportes de ingresos',
	},
	{
		slug: 'daniela',
		name: 'Demo Daniela',
		lastName: 'Vargas',
		phone: '3001000007',
		identityNumber: '1001000007',
		originTag: 'Web',
		columnKey: 'WON',
		outcome: 'WON',
		estimatedValue: '30000000',
		probability: 100,
		daysAgoCreated: 20,
		idle: false,
		product: 'Ahorro',
		budget: 30000000,
		tags: ['Referido interno'],
		note: 'Cerró el mes pasado. Sirve para la tasa de ganados del reporte.',
		history: [
			{ fromKey: null, toKey: 'NUEVO_LEAD', daysAgo: 20 },
			{ fromKey: 'NUEVO_LEAD', toKey: 'CIERRE', daysAgo: 12 },
			{ fromKey: 'CIERRE', toKey: 'WON', daysAgo: 10 },
		],
		tasks: [],
	},
	{
		slug: 'andres',
		name: 'Demo Andrés',
		lastName: 'Peña',
		phone: '3001000008',
		identityNumber: '1001000008',
		originTag: 'Instagram',
		columnKey: 'NEGOCIO_APLAZADO',
		outcome: 'LOST',
		estimatedValue: '10000000',
		probability: 0,
		daysAgoCreated: 18,
		idle: false,
		product: 'Protección',
		budget: 10000000,
		tags: [],
		note: 'Aplazó la decisión por presupuesto. Quedó como perdido.',
		history: [
			{ fromKey: null, toKey: 'NUEVO_LEAD', daysAgo: 18 },
			{ fromKey: 'NUEVO_LEAD', toKey: 'NEGOCIO_APLAZADO', daysAgo: 9 },
		],
		tasks: [],
	},
]

function bogotaDayStart(now: Date): Date {
	const bogota = new Date(now.getTime() - BOGOTA_OFFSET_MS)
	const midnightUtc = Date.UTC(bogota.getUTCFullYear(), bogota.getUTCMonth(), bogota.getUTCDate())
	return new Date(midnightUtc + BOGOTA_OFFSET_MS)
}

function daysAgo(now: Date, amount: number): Date {
	return new Date(bogotaDayStart(now).getTime() - amount * DAY_MS + 12 * HOUR_MS)
}

/** OPEN leads must fall inside the current Bogotá month or the board hides them. */
function createdAtFor(now: Date, lead: DemoLead): Date {
	const wanted = daysAgo(now, lead.daysAgoCreated)
	if (lead.outcome !== 'OPEN') return wanted
	const monthStart = bogotaDayStart(now)
	monthStart.setUTCDate(1)
	const monthNoon = new Date(bogotaDayStart(monthStart).getTime() + 12 * HOUR_MS)
	return wanted.getTime() < monthNoon.getTime() ? monthNoon : wanted
}

async function main() {
	const { PrismaClient } = await import('@prisma/client')
	const prisma = new PrismaClient()
	const now = new Date()

	try {
		const agentRole = await prisma.role.findFirst({
			where: { code: 'AGENTE', active: true },
			select: { idRole: true },
		})
		if (!agentRole) {
			console.error('No hay un rol AGENTE activo. No se cargaron demos.')
			process.exit(1)
		}
		const owner = await prisma.user.upsert({
			where: { email: DEMO_OWNER_EMAIL },
			update: { name: 'Asesor', lastName: 'Demo', active: true, idRole: agentRole.idRole },
			create: {
				name: 'Asesor',
				lastName: 'Demo',
				email: DEMO_OWNER_EMAIL,
				typeIdentity: 'CC',
				identityNumber: '9001000001',
				idRole: agentRole.idRole,
				entryDate: new Date('2026-11-01T00:00:00.000Z'),
				active: true,
				ssoOnly: true,
			},
			select: { idUser: true, name: true, lastName: true },
		})

		const columns = await prisma.leadFunnelColumn.findMany({
			where: { active: true },
			select: { idLeadFunnelColumn: true, externalStatusKey: true },
		})
		const columnId = new Map(columns.map((column) => [column.externalStatusKey, column.idLeadFunnelColumn]))

		const tagId = new Map<string, number>()
		for (const tag of TAGS) {
			const existing = await prisma.leadTag.findFirst({
				where: { name: tag.name, active: true },
				select: { idLeadTag: true },
			})
			const saved = existing
				? await prisma.leadTag.update({
						where: { idLeadTag: existing.idLeadTag },
						data: { color: tag.color },
						select: { idLeadTag: true },
					})
				: await prisma.leadTag.create({
						data: { name: tag.name, color: tag.color, createdBy: owner.idUser },
						select: { idLeadTag: true },
					})
			tagId.set(tag.name, saved.idLeadTag)
		}

		await prisma.leadCustomField.upsert({
			where: { key: 'demo_producto' },
			update: { label: 'Producto de interés', type: 'SELECT', options: ['Ahorro', 'Protección', 'Inversión'], active: true },
			create: {
				key: 'demo_producto',
				label: 'Producto de interés',
				type: 'SELECT',
				options: ['Ahorro', 'Protección', 'Inversión'],
				position: 1,
				createdBy: owner.idUser,
			},
		})
		await prisma.leadCustomField.upsert({
			where: { key: 'demo_meta' },
			update: { label: 'Meta (COP)', type: 'NUMBER', options: [], active: true },
			create: {
				key: 'demo_meta',
				label: 'Meta (COP)',
				type: 'NUMBER',
				position: 2,
				createdBy: owner.idUser,
			},
		})

		const admins = await prisma.user.findMany({
			where: { active: true, role: { code: 'ADMIN' } },
			select: { idUser: true },
		})
		const savedQuery = {
			q: 'Demo',
			statuses: [],
			stageIds: [],
			ownerIds: [],
			tagIds: [],
			idle: false,
			sort: 'createdAt',
			dir: 'desc',
		}
		for (const admin of admins) {
			const view = await prisma.leadSavedView.findFirst({
				where: { idUser: admin.idUser, name: 'Demos del CRM', active: true },
				select: { idLeadSavedView: true },
			})
			if (view) {
				await prisma.leadSavedView.update({
					where: { idLeadSavedView: view.idLeadSavedView },
					data: { query: savedQuery },
				})
			} else {
				await prisma.leadSavedView.create({
					data: { idUser: admin.idUser, name: 'Demos del CRM', query: savedQuery },
				})
			}
		}

		let count = 0
		for (const demo of DEMO_LEADS) {
			const idLeadFunnelColumn = columnId.get(demo.columnKey)
			if (!idLeadFunnelColumn) {
				console.warn(`Sin columna ${demo.columnKey}. Se omite ${demo.name}.`)
				continue
			}
			const email = `demo-crm-${demo.slug}@${EMAIL_DOMAIN}`
			const createdAt = createdAtFor(now, demo)
			const lastActivityAt = demo.idle ? createdAt : new Date(now.getTime() - 2 * HOUR_MS)
			const data = {
				name: demo.name,
				lastName: demo.lastName,
				email,
				phone: demo.phone,
				identityNumber: demo.identityNumber,
				originTag: demo.originTag,
				externalCrmId: null,
				externalUrl: null,
				idUser: owner.idUser,
				idLeadFunnelColumn,
				outcomeStatus: demo.outcome,
				active: true,
				lastActivityAt,
				estimatedValue: demo.estimatedValue,
				probability: demo.probability,
				customFieldValues: { demo_producto: demo.product, demo_meta: demo.budget },
				createdAt,
			}

			const existing = await prisma.lead.findFirst({
				where: { email, externalCrmId: null },
				select: { idLead: true },
			})
			const lead = existing
				? await prisma.lead.update({ where: { idLead: existing.idLead }, data, select: { idLead: true } })
				: await prisma.lead.create({ data, select: { idLead: true } })

			await prisma.leadActivity.upsert({
				where: { idLead_correlationId: { idLead: lead.idLead, correlationId: `demo-crm:${demo.slug}:note` } },
				update: { payload: { note: demo.note }, occurredAt: createdAt, idUser: owner.idUser },
				create: {
					idLead: lead.idLead,
					idUser: owner.idUser,
					type: 'NOTE_ADDED',
					payload: { note: demo.note },
					payloadVersion: 1,
					occurredAt: createdAt,
					correlationId: `demo-crm:${demo.slug}:note`,
				},
			})
			if (demo.callSummary) {
				await prisma.leadActivity.upsert({
					where: { idLead_correlationId: { idLead: lead.idLead, correlationId: `demo-crm:${demo.slug}:call` } },
					update: {
						payload: { summary: demo.callSummary, outcome: 'CONNECTED', durationMinutes: 12 },
						occurredAt: lastActivityAt,
						idUser: owner.idUser,
					},
					create: {
						idLead: lead.idLead,
						idUser: owner.idUser,
						type: 'CALL_LOGGED',
						payload: { summary: demo.callSummary, outcome: 'CONNECTED', durationMinutes: 12 },
						payloadVersion: 1,
						occurredAt: lastActivityAt,
						correlationId: `demo-crm:${demo.slug}:call`,
					},
				})
			}

			const historyCount = await prisma.leadStageHistory.count({
				where: { idLead: lead.idLead, source: 'MANUAL' },
			})
			if (historyCount === 0) {
				for (const step of demo.history) {
					const toId = columnId.get(step.toKey)
					const fromId = step.fromKey ? columnId.get(step.fromKey) : null
					if (!toId) continue
					await prisma.leadStageHistory.create({
						data: {
							idLead: lead.idLead,
							fromIdLeadFunnelColumn: fromId ?? null,
							toIdLeadFunnelColumn: toId,
							source: 'MANUAL',
							idUser: owner.idUser,
							changedAt: daysAgo(now, step.daysAgo),
						},
					})
				}
			}

			for (const task of demo.tasks) {
				const dueAt =
					task.dueOffsetHours === null
						? null
						: new Date(bogotaDayStart(now).getTime() + task.dueOffsetHours * HOUR_MS)
				const completedAt = task.status === 'DONE' ? new Date(now.getTime() - DAY_MS) : null
				const current = await prisma.leadTask.findFirst({
					where: { idLead: lead.idLead, title: task.title },
					orderBy: { idLeadTask: 'asc' },
					select: { idLeadTask: true },
				})
				const taskData = {
					type: task.type,
					status: task.status,
					dueAt,
					completedAt,
					assignedTo: owner.idUser,
					createdBy: owner.idUser,
				}
				if (current) {
					await prisma.leadTask.update({ where: { idLeadTask: current.idLeadTask }, data: taskData })
				} else {
					await prisma.leadTask.create({
						data: { idLead: lead.idLead, title: task.title, ...taskData },
					})
				}
			}

			for (const tagName of demo.tags) {
				const idLeadTag = tagId.get(tagName)
				if (!idLeadTag) continue
				await prisma.leadTagAssignment.upsert({
					where: { idLead_idLeadTag: { idLead: lead.idLead, idLeadTag } },
					update: { active: true, assignedBy: owner.idUser },
					create: { idLead: lead.idLead, idLeadTag, assignedBy: owner.idUser },
				})
			}

			if (demo.supportSubject) {
				const support = await prisma.leadSupportCase.findFirst({
					where: { idLead: lead.idLead, subject: demo.supportSubject },
					select: { idLeadSupportCase: true },
				})
				if (!support) {
					await prisma.leadSupportCase.create({
						data: {
							idLead: lead.idLead,
							openedBy: owner.idUser,
							assignedTo: owner.idUser,
							subject: demo.supportSubject,
							status: 'OPEN',
							priority: 'HIGH',
							dueAt: new Date(now.getTime() + 2 * DAY_MS),
						},
					})
				}
			}

			count += 1
			console.log(`  ${demo.name} ${demo.lastName} · ${demo.columnKey} · ${demo.outcome}`)
		}

		const demoLead = { email: { endsWith: `@${EMAIL_DOMAIN}` } }
		await prisma.leadStageHistory.updateMany({
			where: { lead: demoLead, source: 'MANUAL' },
			data: { idUser: owner.idUser },
		})
		await prisma.leadSupportCase.updateMany({
			where: { lead: demoLead },
			data: { openedBy: owner.idUser, assignedTo: owner.idUser },
		})
		await prisma.leadTag.updateMany({
			where: { name: { in: TAGS.map((tag) => tag.name) } },
			data: { createdBy: owner.idUser },
		})
		await prisma.leadCustomField.updateMany({
			where: { key: { in: ['demo_producto', 'demo_meta'] } },
			data: { createdBy: owner.idUser },
		})

		const ownerName = [owner.name, owner.lastName].filter(Boolean).join(' ')
		console.log(`\n${count} leads demo, sin vínculo con GoHighLevel.`)
		console.log(`Responsable y agenda: ${ownerName}. No se asignó a un asesor que ya tenía trabajo.`)
		console.log('En la pestaña Leads abre la vista "Demos del CRM" o busca "Demo".')
	} finally {
		await prisma.$disconnect()
	}
}

main().catch((error: unknown) => {
	console.error(error)
	process.exit(1)
})
