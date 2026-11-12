/** JSON body, or multipart field `event` plus `files`. */
export async function readJsonOrFiles(
	request: Request
): Promise<{ ok: true; body: unknown; files: File[] } | { ok: false; error: string }> {
	const contentType = request.headers.get('content-type') ?? ''
	if (!contentType.includes('multipart/form-data')) {
		return { ok: true, body: await request.json(), files: [] }
	}
	const form = await request.formData()
	const raw = form.get('event')
	if (typeof raw !== 'string') return { ok: false, error: 'Actualización inválida' }
	try {
		const files = form
			.getAll('files')
			.filter((entry): entry is File => entry instanceof File && entry.size > 0)
		return { ok: true, body: JSON.parse(raw), files }
	} catch {
		return { ok: false, error: 'Actualización inválida' }
	}
}

export function jsonOrFilesInit(method: 'PATCH', body: object, files: readonly File[]): RequestInit {
	if (files.length === 0) {
		return {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		}
	}
	const form = new FormData()
	form.set('event', JSON.stringify(body))
	for (const file of files) form.append('files', file)
	return { method, body: form }
}
