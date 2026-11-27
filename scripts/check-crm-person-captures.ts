/** Real-service regression check. Run only against the disposable CRM test database. */
import assert from 'node:assert/strict'

const connection = new URL(process.env.DATABASE_URL ?? 'http://missing')
assert.equal(
	connection.hostname,
	'127.0.0.1',
	'Only the disposable localhost database is allowed'
)
assert.equal(connection.port, '55438')
assert.equal(connection.pathname, '/crm_person_captures')
assert.equal(connection.username, 'crm_test')

const { prisma } = await import('../src/lib/prisma')
const { createLead } =
	await import('../src/features/leads/services/create-lead.service')
const { getLeadBoard } =
	await import('../src/features/leads/services/lead-board.service')
const { assignLeadOwner } =
	await import('../src/features/leads/services/assign-lead-owner.service')
const { upsertLeadFromCrm } =
	await import('../src/features/leads/services/lead-sync.service')
const { importLeadsFromCsv } =
	await import('../src/features/leads/services/lead-csv-import.service')
const { ingestLeadFormSubmission } =
	await import('../src/features/leads/services/lead-form-submission.service')
const { formSubmissionPayloadSchema } =
	await import('../src/features/leads/types/form-submission.schema')
const { getLeadTimelinePage } =
	await import('../src/features/leads/activities/lead-timeline.service')
const { validateLeadCapture } =
	await import('../src/features/leads/captures/lead-capture.service')
const marker = `integration-${Date.now()}`
let passed = 0
function pass(message: string) {
	passed++
	console.log(`PASS ${passed}: ${message}`)
}
try {
	const [advisor, other] = await Promise.all(
		['advisor', 'other'].map((name) =>
			prisma.user.create({
				data: {
					name,
					email: `${marker}-${name}@example.com`,
					entryDate: new Date(),
				},
			})
		)
	)
	const ctx = { userId: advisor.idUser, email: advisor.email }
	const [low, high] = await Promise.all(
		[1, 2].map((level) =>
			prisma.leadCapture.create({ data: { name: `${marker}-${level}`, level } })
		)
	)
	const column = await prisma.leadFunnelColumn.upsert({
		where: { externalStatusKey: 'NUEVO_LEAD' },
		update: { active: true },
		create: {
			externalStatusKey: 'NUEVO_LEAD',
			name: 'Lead Nuevo',
			position: 0,
		},
	})
	await prisma.leadFunnelColumn.upsert({
		where: { externalStatusKey: '__unmapped__' },
		update: {},
		create: {
			externalStatusKey: '__unmapped__',
			name: 'Sin mapear',
			isFallback: true,
		},
	})
	await prisma.clientOrigin.upsert({
		where: { code: 'propio' },
		update: { status: true },
		create: { code: 'propio', name: 'Propio' },
	})
	const email = `${marker}-person@example.com`
	const first = await createLead(
		{
			name: 'Synthetic person',
			email,
			idLeadCapture: low.idLeadCapture,
			referrerName: 'Initial referrer',
		},
		advisor.idUser,
		ctx,
		[]
	)
	const second = await createLead(
		{ name: 'Synthetic person', email, idLeadCapture: high.idLeadCapture },
		other.idUser,
		ctx,
		[]
	)
	assert(first.ok && second.ok)
	const firstId = first.lead.idLead
	const secondId = second.lead.idLead
	let rows = await prisma.lead.findMany({
		where: { idLead: { in: [firstId, secondId] } },
	})
	assert(
		rows.every(
			(row) =>
				row.active &&
				row.outcomeStatus === 'OPEN' &&
				row.idUser === advisor.idUser
		)
	)
	const board = await getLeadBoard(
		{ idUser: advisor.idUser, role: { code: 'ADMIN' } },
		{ ownerIds: [advisor.idUser] }
	)
	const cards = board
		.flatMap((col) => col.leads)
		.filter((card) =>
			card.captures?.some((record) => record.idLead === firstId)
		)
	assert.equal(cards.length, 1)
	assert.equal(cards[0].idLead, secondId)
	assert.equal(cards[0].captures?.length, 2)
	pass(
		'two native captures remain active, inherit one advisor and render one person card'
	)
	const timeline = await getLeadTimelinePage(firstId, {
		visibleLeadIds: [firstId, secondId],
		limit: 100,
	})
	assert(
		timeline.items.some(
			(entry) =>
				entry.kind === 'lead_ingress' &&
				entry.source === 'AUTO' &&
				entry.actorName === 'Sistema'
		)
	)
	assert(
		timeline.items.some(
			(entry) =>
				entry.kind === 'stage_change' &&
				entry.source === 'MANUAL' &&
				entry.actorName === advisor.name
		)
	)
	pass(
		'group timeline keeps automatic system attribution and the real native initiator'
	)
	const assignment = await assignLeadOwner(firstId, other.idUser, ctx, [])
	assert(assignment.ok)
	rows = await prisma.lead.findMany({
		where: { idLead: { in: [firstId, secondId] } },
	})
	assert(rows.every((row) => row.idUser === other.idUser))
	const historiesBefore = await prisma.leadChangeHistory.count({
		where: { idLead: { in: [firstId, secondId] } },
	})
	await prisma.lead.update({
		where: { idLead: secondId },
		data: { idUser: advisor.idUser },
	})
	const rejected = await assignLeadOwner(firstId, other.idUser, ctx, [
		other.idUser,
	])
	assert.equal(rejected.ok, false)
	assert.equal(
		(await prisma.lead.findUniqueOrThrow({ where: { idLead: secondId } }))
			.idUser,
		advisor.idUser
	)
	assert.equal(
		await prisma.leadChangeHistory.count({
			where: { idLead: { in: [firstId, secondId] } },
		}),
		historiesBefore
	)
	await assignLeadOwner(firstId, other.idUser, ctx, [])
	pass(
		'whole-group reassignment succeeds and a hidden member rejects without owner/history writes'
	)
	await prisma.leadCapture.update({
		where: { idLeadCapture: low.idLeadCapture },
		data: { status: false },
	})
	await validateLeadCapture(prisma, low.idLeadCapture, low.idLeadCapture)
	const countBefore = await prisma.lead.count()
	const inactive = await createLead(
		{
			name: 'Invalid new selection',
			email: `${marker}-invalid@example.com`,
			idLeadCapture: low.idLeadCapture,
		},
		advisor.idUser,
		ctx,
		[]
	)
	assert.equal(inactive.ok, false)
	assert.equal(await prisma.lead.count(), countBefore)
	assert.equal(
		(await prisma.lead.findUniqueOrThrow({ where: { idLead: firstId } }))
			.idLeadCapture,
		low.idLeadCapture
	)
	pass(
		'inactive catalogue entries remain assigned but cannot be newly selected'
	)
	const syncBase = {
		externalCrmId: `${marker}-sync`,
		statusKey: 'NUEVO_LEAD',
		ownerEmail: advisor.email,
		name: 'Sync synthetic',
		email: `${marker}-sync@example.com`,
	}
	const synced = await upsertLeadFromCrm({
		...syncBase,
		idLeadCapture: high.idLeadCapture,
		referrerName: 'First sync referrer',
		originTag: 'Initial source',
	})
	await upsertLeadFromCrm({
		...syncBase,
		ownerEmail: other.email,
		referrerName: 'Overwrite attempt',
		originTag: 'Later source',
	})
	const syncedRow = await prisma.lead.findUniqueOrThrow({
		where: { idLead: synced.idLead },
	})
	assert.equal(syncedRow.idLeadCapture, high.idLeadCapture)
	assert.equal(syncedRow.referrerName, 'First sync referrer')
	assert.equal(syncedRow.originTag, 'Initial source')
	assert.equal(syncedRow.idUser, other.idUser)
	assert.equal(
		await prisma.lead.count({
			where: { externalCrmId: syncBase.externalCrmId },
		}),
		1
	)
	await assert.rejects(
		upsertLeadFromCrm({ ...syncBase, idLeadCapture: low.idLeadCapture })
	)
	const legacy = await upsertLeadFromCrm({
		...syncBase,
		externalCrmId: `${marker}-legacy`,
		email: `${marker}-legacy@example.com`,
	})
	assert.equal(
		(await prisma.lead.findUniqueOrThrow({ where: { idLead: legacy.idLead } }))
			.idLeadCapture,
		null
	)
	pass(
		'webhook legacy/retry preserves capture and initial attribution; explicit owner changes apply'
	)
	const rawBase = {
		nombre: 'CSV synthetic',
		apellido: '',
		telefono: '',
		columna_funnel: column.name,
		estado: 'OPEN',
		fecha_creacion: new Date().toISOString(),
		origen: 'Propio',
		propietario_correo: advisor.email,
		propietario_nombre: '',
	}
	const csv = await importLeadsFromCsv(
		[
			{
				...rawBase,
				id_externo_crm: `${marker}-csv-new`,
				correo: `${marker}-csv-new@example.com`,
				id_captura: String(high.idLeadCapture),
				referido_por: 'CSV referrer',
			},
			{
				...rawBase,
				id_externo_crm: `${marker}-csv-legacy`,
				correo: `${marker}-csv-old@example.com`,
			},
		],
		{ ...ctx, manageableUserIds: [] }
	)
	assert.equal(csv.imported, 2, JSON.stringify(csv))
	const csvNew = await prisma.lead.findUniqueOrThrow({
		where: { externalCrmId: `${marker}-csv-new` },
	})
	assert.equal(csvNew.idLeadCapture, high.idLeadCapture)
	assert.equal(csvNew.referrerName, 'CSV referrer')
	assert.equal(
		(
			await prisma.lead.findUniqueOrThrow({
				where: { externalCrmId: `${marker}-csv-legacy` },
			})
		).idLeadCapture,
		null
	)
	pass(
		'CSV imports optional capture/referrer columns and unchanged legacy rows'
	)
	await prisma.leadCapture.update({
		where: { idLeadCapture: low.idLeadCapture },
		data: { status: true },
	})
	const rollbackEmail = `${marker}-rollback@example.com`
	const countsBeforeFailure = await Promise.all([
		prisma.lead.count(),
		prisma.leadClientOrigin.count(),
		prisma.leadStageHistory.count(),
		prisma.leadChangeHistory.count(),
	])
	await assert.rejects(
		createLead(
			{
				name: 'Rolled back synthetic lead',
				email: rollbackEmail,
				idLeadCapture: high.idLeadCapture,
			},
			advisor.idUser,
			{ userId: 2147483647, email: 'nonexistent-actor@example.com' },
			[]
		)
	)
	assert.deepEqual(
		await Promise.all([
			prisma.lead.count(),
			prisma.leadClientOrigin.count(),
			prisma.leadStageHistory.count(),
			prisma.leadChangeHistory.count(),
		]),
		countsBeforeFailure
	)
	assert.equal(await prisma.lead.count({ where: { email: rollbackEmail } }), 0)
	pass(
		'a foreign-key failure after lead insertion rolls back the lead, attribution and histories'
	)
	const formEmail = `${marker}-landing@example.com`
	const form = (captureId: number, suffix: string) =>
		formSubmissionPayloadSchema.parse({
			submissionId: `${marker}-${suffix}`,
			submittedAt: new Date().toISOString(),
			landing: { key: 'synthetic', name: 'Synthetic landing', version: '1' },
			lead: {
				statusKey: 'NUEVO_LEAD',
				name: 'Landing synthetic',
				email: formEmail,
				ownerEmail: advisor.email,
				idLeadCapture: captureId,
				referrerName: 'Landing referrer',
			},
			fields: [],
		})
	const formOne = await ingestLeadFormSubmission(
		form(low.idLeadCapture, 'landing-one')
	)
	const formTwoPayload = form(high.idLeadCapture, 'landing-two')
	const formTwo = await ingestLeadFormSubmission(formTwoPayload)
	const replay = await ingestLeadFormSubmission(formTwoPayload)
	assert.notEqual(formOne.idLead, formTwo.idLead)
	assert.equal(replay.idLead, formTwo.idLead)
	assert.equal(replay.replayed, true)
	assert.equal(
		await prisma.leadFormSubmission.count({
			where: { idLead: { in: [formOne.idLead, formTwo.idLead] } },
		}),
		2
	)
	assert.equal(
		await prisma.lead.count({
			where: {
				idLead: { in: [formOne.idLead, formTwo.idLead] },
				active: true,
				idUser: advisor.idUser,
			},
		}),
		2
	)
	pass(
		'landing creates a separate opportunity per capture and replay stores no duplicate snapshot'
	)
	console.log(`Real database regression checks passed: ${passed}`)
} finally {
	await prisma.$disconnect()
}
