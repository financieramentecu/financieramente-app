import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { LeadCaptureInput, LeadCapturePatch } from './lead-capture.schema'

export function listLeadCaptures(activeOnly = false) {
	return prisma.leadCapture.findMany({
		where: activeOnly ? { status: true } : {},
		orderBy: [{ level: 'asc' }, { name: 'asc' }],
	})
}
export async function saveLeadCapture(
	input: LeadCaptureInput | LeadCapturePatch,
	idLeadCapture?: number
) {
	try {
		const capture =
			idLeadCapture === undefined
				? await prisma.leadCapture.create({ data: input as LeadCaptureInput })
				: await prisma.leadCapture.update({
						where: { idLeadCapture },
						data: input,
					})
		return { ok: true as const, capture }
	} catch (cause) {
		if (cause instanceof Prisma.PrismaClientKnownRequestError) {
			if (cause.code === 'P2002')
				return {
					ok: false as const,
					status: 409,
					error: 'Ya existe una captura con ese nombre',
				}
			if (cause.code === 'P2025')
				return {
					ok: false as const,
					status: 404,
					error: 'Captura no encontrada',
				}
		}
		throw cause
	}
}

export class LeadCaptureValidationError extends Error {
	readonly status = 409
	constructor() {
		super('La captura no está disponible')
	}
}
export async function validateLeadCapture(
	db: Pick<Prisma.TransactionClient, 'leadCapture'>,
	idLeadCapture?: number | null,
	currentId?: number | null
): Promise<void> {
	if (idLeadCapture == null || idLeadCapture === currentId) return
	if (
		!(await db.leadCapture.findFirst({
			where: { idLeadCapture, status: true },
			select: { idLeadCapture: true },
		}))
	)
		throw new LeadCaptureValidationError()
}
