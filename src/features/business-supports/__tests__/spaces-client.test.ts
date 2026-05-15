import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the AWS SDK modules before importing the module under test
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
    DeleteObjectCommand: vi.fn(),
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
  }
})

vi.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: vi.fn().mockResolvedValue('https://presigned.example.com/url'),
  }
})

// Must import after mocks are registered
const getModule = async () => await import('../lib/spaces-client')

const REQUIRED_ENV_VARS = {
  DO_SPACES_KEY: 'test-key',
  DO_SPACES_SECRET: 'test-secret',
  DO_SPACES_ENDPOINT: 'https://ams3.digitaloceanspaces.com',
  DO_SPACES_BUCKET: 'test-bucket',
  DO_SPACES_PREFIX: 'test-prefix',
}

describe('getSpacesConfig', () => {
  beforeEach(() => {
    // Set all env vars
    for (const [key, value] of Object.entries(REQUIRED_ENV_VARS)) {
      process.env[key] = value
    }
    vi.resetModules()
  })

  afterEach(() => {
    for (const key of Object.keys(REQUIRED_ENV_VARS)) {
      delete process.env[key]
    }
    vi.resetModules()
  })

  it('returns config when all env vars are present', async () => {
    const { getSpacesConfig } = await getModule()
    const config = getSpacesConfig()
    expect(config.bucket).toBe('test-bucket')
    expect(config.prefix).toBe('test-prefix')
    expect(config.endpoint).toBe('https://ams3.digitaloceanspaces.com')
  })

  it('throws when DO_SPACES_KEY is missing', async () => {
    delete process.env.DO_SPACES_KEY
    const { getSpacesConfig } = await getModule()
    expect(() => getSpacesConfig()).toThrow('DO_SPACES_KEY')
  })

  it('throws when DO_SPACES_SECRET is missing', async () => {
    delete process.env.DO_SPACES_SECRET
    const { getSpacesConfig } = await getModule()
    expect(() => getSpacesConfig()).toThrow('DO_SPACES_SECRET')
  })

  it('throws when DO_SPACES_ENDPOINT is missing', async () => {
    delete process.env.DO_SPACES_ENDPOINT
    const { getSpacesConfig } = await getModule()
    expect(() => getSpacesConfig()).toThrow('DO_SPACES_ENDPOINT')
  })

  it('throws when DO_SPACES_BUCKET is missing', async () => {
    delete process.env.DO_SPACES_BUCKET
    const { getSpacesConfig } = await getModule()
    expect(() => getSpacesConfig()).toThrow('DO_SPACES_BUCKET')
  })

  it('throws when DO_SPACES_PREFIX is missing', async () => {
    delete process.env.DO_SPACES_PREFIX
    const { getSpacesConfig } = await getModule()
    expect(() => getSpacesConfig()).toThrow('DO_SPACES_PREFIX')
  })
})

describe('presignPutUrl', () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(REQUIRED_ENV_VARS)) {
      process.env[key] = value
    }
    vi.resetModules()
  })

  afterEach(() => {
    for (const key of Object.keys(REQUIRED_ENV_VARS)) {
      delete process.env[key]
    }
    vi.resetModules()
  })

  it('returns a presigned URL string', async () => {
    const { presignPutUrl } = await getModule()
    const url = await presignPutUrl('some/key.jpg', 'image/jpeg')
    expect(typeof url).toBe('string')
    expect(url.length).toBeGreaterThan(0)
  })
})

describe('presignGetUrl', () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(REQUIRED_ENV_VARS)) {
      process.env[key] = value
    }
    vi.resetModules()
  })

  afterEach(() => {
    for (const key of Object.keys(REQUIRED_ENV_VARS)) {
      delete process.env[key]
    }
    vi.resetModules()
  })

  it('returns a presigned URL string', async () => {
    const { presignGetUrl } = await getModule()
    const url = await presignGetUrl('some/key.jpg')
    expect(typeof url).toBe('string')
    expect(url.length).toBeGreaterThan(0)
  })
})
