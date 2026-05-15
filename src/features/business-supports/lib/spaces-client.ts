/**
 * Digital Ocean Spaces S3-compatible client.
 *
 * NOTE: The AWS SDK requires a `region` parameter. Digital Ocean Spaces ignores
 * it, but the SDK will fail if it is missing. We hard-code 'us-east-1' as a
 * dummy value — this is expected and intentional.
 *
 * ── DEPLOY CHECKLIST ──────────────────────────────────────────────────────────
 * Before going live, configure CORS on the DO Spaces bucket so that presigned
 * PUT requests from the app domain are allowed:
 *
 *  1. In the DO dashboard → Spaces → your bucket → Settings → CORS.
 *  2. Add a rule:
 *       Origin:          https://app.financieramente.co (and staging if needed)
 *       Allowed methods: PUT, GET
 *       Allowed headers: Content-Type
 *       Max age:         3600
 *  3. Without this rule the browser will get a CORS error on the presigned PUT.
 *  4. Ensure DO_SPACES_* env vars are set in the production/staging environment:
 *       DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_ENDPOINT,
 *       DO_SPACES_BUCKET, DO_SPACES_PREFIX
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface SpacesConfig {
  key: string
  secret: string
  endpoint: string
  bucket: string
  prefix: string
}

/**
 * Reads and validates DO_SPACES_* env vars.
 * Throws a clear error if any required variable is missing.
 */
export function getSpacesConfig(): SpacesConfig {
  const required = {
    DO_SPACES_KEY: process.env.DO_SPACES_KEY,
    DO_SPACES_SECRET: process.env.DO_SPACES_SECRET,
    DO_SPACES_ENDPOINT: process.env.DO_SPACES_ENDPOINT,
    DO_SPACES_BUCKET: process.env.DO_SPACES_BUCKET,
    DO_SPACES_PREFIX: process.env.DO_SPACES_PREFIX,
  }

  for (const [name, value] of Object.entries(required)) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`)
    }
  }

  return {
    key: required.DO_SPACES_KEY!,
    secret: required.DO_SPACES_SECRET!,
    endpoint: required.DO_SPACES_ENDPOINT!,
    bucket: required.DO_SPACES_BUCKET!,
    prefix: required.DO_SPACES_PREFIX!,
  }
}

let _client: S3Client | null = null

function getClient(): S3Client {
  if (!_client) {
    const config = getSpacesConfig()
    _client = new S3Client({
      // DO Spaces is S3-compatible; 'us-east-1' is required by SDK but ignored by DO
      region: 'us-east-1',
      endpoint: config.endpoint,
      forcePathStyle: false,
      credentials: {
        accessKeyId: config.key,
        secretAccessKey: config.secret,
      },
    })
  }
  return _client
}

/** Generate a presigned PUT URL for direct client upload to Spaces */
export async function presignPutUrl(
  objectKey: string,
  mimeType: string,
  expiresIn = 300,
): Promise<string> {
  const { bucket } = getSpacesConfig()
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: mimeType,
  })
  return getSignedUrl(getClient(), command, { expiresIn })
}

/** Generate a presigned GET URL for viewing a private object (1 hour expiry) */
export async function presignGetUrl(
  objectKey: string,
  expiresIn = 3600,
): Promise<string> {
  const { bucket } = getSpacesConfig()
  const command = new GetObjectCommand({ Bucket: bucket, Key: objectKey })
  const url = await getSignedUrl(getClient(), command, { expiresIn })
  return url
}

/** Soft stub — actual Space lifecycle deletion deferred to v2 */
export async function deleteObject(objectKey: string): Promise<void> {
  const { bucket } = getSpacesConfig()
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: objectKey })
  await getClient().send(command)
}

/** Reset singleton — used in tests only */
export function _resetClientForTest(): void {
  _client = null
}
