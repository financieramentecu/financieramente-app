export interface LeadActivityAttachment {
	name: string
	mimeType: string
	size: number
	key: string
}

export const ACTIVITY_ATTACHMENT_LIMIT = 3
export const ACTIVITY_ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'application/pdf',
	'text/plain',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export function isActivityImage(mimeType: string): boolean {
	return mimeType.startsWith('image/')
}

export function readActivityAttachments(payload: object): LeadActivityAttachment[] {
	if (!('attachments' in payload) || !Array.isArray(payload.attachments)) return []
	return payload.attachments as LeadActivityAttachment[]
}

export function validateActivityFiles(
	files: readonly { type: string; size: number }[]
): { ok: true } | { ok: false; error: string } {
	if (files.length > ACTIVITY_ATTACHMENT_LIMIT) {
		return { ok: false, error: 'Puedes adjuntar hasta 3 archivos' }
	}
	for (const file of files) {
		if (!ALLOWED_MIME_TYPES.has(file.type)) {
			return { ok: false, error: 'Ese tipo de archivo no está permitido' }
		}
		if (file.size < 1 || file.size > ACTIVITY_ATTACHMENT_MAX_BYTES) {
			return { ok: false, error: 'Cada archivo debe pesar hasta 4 MB' }
		}
	}
	return { ok: true }
}

/** Images open in the browser. Documents download. */
export function attachmentContentDisposition(mimeType: string, name: string): string {
	const ascii = name.replace(/[^\w.\- ]/g, '_').slice(0, 180) || 'archivo'
	const kind = isActivityImage(mimeType) ? 'inline' : 'attachment'
	return `${kind}; filename="${ascii}"`
}

export function safeAttachmentName(name: string): string {
	const base = name.split(/[/\\]/).pop() ?? 'archivo'
	return base.replace(/[^\w.\- ]/g, '_').slice(0, 180) || 'archivo'
}
