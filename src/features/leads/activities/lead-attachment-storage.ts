import { randomUUID } from 'node:crypto'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
	safeAttachmentName,
	type LeadActivityAttachment,
} from '@/features/leads/activities/lead-activity-attachment'

export class LeadAttachmentStorageError extends Error {
	constructor() {
		super('Lead attachment storage is not configured')
	}
}

interface SpacesRuntime {
	bucket: string
	prefix: string
	client: S3Client
}

let client: S3Client | null = null

function spaces(): SpacesRuntime {
	const key = process.env.DO_SPACES_KEY
	const secret = process.env.DO_SPACES_SECRET
	const endpoint = process.env.DO_SPACES_ENDPOINT
	const bucket = process.env.DO_SPACES_BUCKET
	const prefix = process.env.DO_SPACES_PREFIX
	if (!key || !secret || !endpoint || !bucket || !prefix) {
		throw new LeadAttachmentStorageError()
	}
	if (!client) {
		client = new S3Client({
			region: 'us-east-1',
			endpoint,
			forcePathStyle: false,
			credentials: { accessKeyId: key, secretAccessKey: secret },
		})
	}
	return { bucket, prefix, client }
}

export function leadAttachmentKeyPrefix(idLead: number): string {
	const prefix = process.env.DO_SPACES_PREFIX
	if (!prefix) throw new LeadAttachmentStorageError()
	return `${prefix}/leads/${idLead}/`
}

export async function uploadLeadAttachment(
	idLead: number,
	file: { name: string; type: string; size: number; bytes: Uint8Array }
): Promise<LeadActivityAttachment> {
	const runtime = spaces()
	const key = `${runtime.prefix}/leads/${idLead}/${randomUUID()}`
	await runtime.client.send(
		new PutObjectCommand({
			Bucket: runtime.bucket,
			Key: key,
			Body: file.bytes,
			ContentType: file.type,
		})
	)
	return {
		name: safeAttachmentName(file.name),
		mimeType: file.type,
		size: file.size,
		key,
	}
}

export async function readLeadAttachmentObject(key: string): Promise<Uint8Array | null> {
	const runtime = spaces()
	const result = await runtime.client.send(
		new GetObjectCommand({ Bucket: runtime.bucket, Key: key })
	)
	if (!result.Body) return null
	return result.Body.transformToByteArray()
}
