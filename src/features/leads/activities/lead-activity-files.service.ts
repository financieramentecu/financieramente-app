import { prisma } from '@/lib/prisma'
import {
	readActivityAttachments,
	type LeadActivityAttachment,
} from '@/features/leads/activities/lead-activity-attachment'
import type { LeadActivityPayload } from '@/features/leads/activities/lead-activity.service'
import {
	leadAttachmentKeyPrefix,
	readLeadAttachmentObject,
	uploadLeadAttachment,
} from '@/features/leads/activities/lead-attachment-storage'

export async function storeLeadActivityFiles(
	idLead: number,
	files: readonly File[]
): Promise<LeadActivityAttachment[]> {
	const stored: LeadActivityAttachment[] = []
	for (const file of files) {
		stored.push(
			await uploadLeadAttachment(idLead, {
				name: file.name,
				type: file.type,
				size: file.size,
				bytes: new Uint8Array(await file.arrayBuffer()),
			})
		)
	}
	return stored
}

export async function loadLeadActivityFile(
	idLead: number,
	activityId: number,
	index: number
): Promise<{ name: string; mimeType: string; bytes: Uint8Array } | null> {
	if (!Number.isInteger(index) || index < 0) return null
	const activity = await prisma.leadActivity.findFirst({
		where: { idLeadActivity: activityId, idLead },
		select: { payload: true },
	})
	if (!activity || !activity.payload || typeof activity.payload !== 'object') return null
	const file = readActivityAttachments(activity.payload as LeadActivityPayload)[index]
	if (!file || !file.key.startsWith(leadAttachmentKeyPrefix(idLead))) return null
	const bytes = await readLeadAttachmentObject(file.key)
	if (!bytes) return null
	return { name: file.name, mimeType: file.mimeType, bytes }
}
