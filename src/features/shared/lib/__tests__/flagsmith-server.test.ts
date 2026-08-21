import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Module-level mock for flagsmith-nodejs — must be at top level
vi.mock('flagsmith-nodejs', () => {
	const mockGetEnvironmentFlags = vi.fn()
	const MockFlagsmith = vi.fn(() => ({
		getEnvironmentFlags: mockGetEnvironmentFlags,
	}))
	return { Flagsmith: MockFlagsmith, __mockGetEnvironmentFlags: mockGetEnvironmentFlags }
})

describe('flagsmith-server', () => {
	// Reset module registry before each test so the singleton resets
	beforeEach(async () => {
		vi.resetModules()
		vi.clearAllMocks()
	})

	afterEach(() => {
		delete process.env.FLAGSMITH_SERVER_KEY
	})

	describe('getFlagsmithServerState', () => {
		it('returns all flags enabled when FLAGSMITH_SERVER_KEY is not set (e.g. QA)', async () => {
			delete process.env.FLAGSMITH_SERVER_KEY

			const { getFlagsmithServerState } = await import('../flagsmith-server')

			const result = await getFlagsmithServerState()
			const parsed = JSON.parse(result)

			expect(parsed).toHaveProperty('api')
			expect(parsed).toHaveProperty('flags')
			expect(parsed.flags['negocios_advanced_filters'].enabled).toBe(true)
			expect(parsed.flags['dashboard_calculadora'].enabled).toBe(true)
			expect(parsed.flags['impersonation_select'].enabled).toBe(true)
		})

		it('returns fallback state when Flagsmith API throws', async () => {
			process.env.FLAGSMITH_SERVER_KEY = 'test-key'

			const { Flagsmith } = await import('flagsmith-nodejs')
			const mockInstance = { getEnvironmentFlags: vi.fn().mockRejectedValue(new Error('API down')) }
			vi.mocked(Flagsmith).mockReturnValueOnce(mockInstance as never)

			const { getFlagsmithServerState } = await import('../flagsmith-server')

			const result = await getFlagsmithServerState()
			const parsed = JSON.parse(result)

			expect(parsed.flags['negocios_advanced_filters'].enabled).toBe(false)
			expect(parsed.flags['dashboard_calculadora'].enabled).toBe(true)
			expect(parsed.flags['impersonation_select'].enabled).toBe(false)
		})

		it('returns a JSON string with api and flags keys when key is set', async () => {
			process.env.FLAGSMITH_SERVER_KEY = 'test-key'

			const { Flagsmith } = await import('flagsmith-nodejs')
			const mockFlags = {
				negocios_advanced_filters: {
					enabled: true,
					value: null,
					featureId: 1,
					featureName: 'negocios_advanced_filters',
				},
			}

			const mockInstance = { getEnvironmentFlags: vi.fn().mockResolvedValue({ flags: mockFlags }) }
			vi.mocked(Flagsmith).mockReturnValueOnce(mockInstance as never)

			const { getFlagsmithServerState } = await import('../flagsmith-server')

			const result = await getFlagsmithServerState()
			const parsed = JSON.parse(result)

			expect(typeof result).toBe('string')
			expect(parsed).toHaveProperty('api')
			expect(parsed).toHaveProperty('flags')
			expect(parsed.flags).toHaveProperty('negocios_advanced_filters')
			expect(parsed.flags.negocios_advanced_filters.enabled).toBe(true)
		})

		it('returns same serialized result on repeated calls (singleton reuses instance)', async () => {
			process.env.FLAGSMITH_SERVER_KEY = 'test-key'

			const { Flagsmith } = await import('flagsmith-nodejs')
			const mockFlags = {
				negocios_advanced_filters: { enabled: false, value: 'v1', featureId: 2, featureName: 'negocios_advanced_filters' },
			}
			const mockGetEnvFlags = vi.fn().mockResolvedValue({ flags: mockFlags })
			const mockInstance = { getEnvironmentFlags: mockGetEnvFlags }
			vi.mocked(Flagsmith).mockReturnValue(mockInstance as never)

			const { getFlagsmithServerState } = await import('../flagsmith-server')

			await getFlagsmithServerState()
			await getFlagsmithServerState()

			// Constructor called only once — singleton pattern
			expect(Flagsmith as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1)
		})
	})

	describe('isFeatureEnabledServer', () => {
		it('returns true when FLAGSMITH_SERVER_KEY is not set (e.g. QA)', async () => {
			delete process.env.FLAGSMITH_SERVER_KEY

			const { isFeatureEnabledServer } = await import('../flagsmith-server')

			expect(await isFeatureEnabledServer('negocios_advanced_filters')).toBe(true)
			expect(await isFeatureEnabledServer('impersonation_select')).toBe(true)
		})

		it('returns the defined fallback value when Flagsmith API throws', async () => {
			process.env.FLAGSMITH_SERVER_KEY = 'test-key'

			const { Flagsmith } = await import('flagsmith-nodejs')
			const mockInstance = { getEnvironmentFlags: vi.fn().mockRejectedValue(new Error('API down')) }
			vi.mocked(Flagsmith).mockReturnValue(mockInstance as never)

			const { isFeatureEnabledServer } = await import('../flagsmith-server')

			expect(await isFeatureEnabledServer('dashboard_calculadora')).toBe(true)
			expect(await isFeatureEnabledServer('negocios_advanced_filters')).toBe(false)
			expect(await isFeatureEnabledServer('impersonation_select')).toBe(false)
		})

		it('returns true when the feature flag is enabled', async () => {
			process.env.FLAGSMITH_SERVER_KEY = 'test-key'

			const { Flagsmith } = await import('flagsmith-nodejs')
			const mockGetEnvFlags = vi.fn().mockResolvedValue({
				flags: {
					negocios_advanced_filters: {
						enabled: true,
						value: null,
						featureId: 3,
						featureName: 'negocios_advanced_filters',
					},
				},
			})
			const mockInstance = { getEnvironmentFlags: mockGetEnvFlags }
			vi.mocked(Flagsmith).mockReturnValue(mockInstance as never)

			const { isFeatureEnabledServer } = await import('../flagsmith-server')

			const result = await isFeatureEnabledServer('negocios_advanced_filters')
			expect(result).toBe(true)
		})

		it('returns false when the feature flag is disabled', async () => {
			process.env.FLAGSMITH_SERVER_KEY = 'test-key'

			const { Flagsmith } = await import('flagsmith-nodejs')
			const mockGetEnvFlags = vi.fn().mockResolvedValue({
				flags: {
					negocios_advanced_filters: {
						enabled: false,
						value: null,
						featureId: 4,
						featureName: 'negocios_advanced_filters',
					},
				},
			})
			const mockInstance = { getEnvironmentFlags: mockGetEnvFlags }
			vi.mocked(Flagsmith).mockReturnValue(mockInstance as never)

			const { isFeatureEnabledServer } = await import('../flagsmith-server')

			const result = await isFeatureEnabledServer('negocios_advanced_filters')
			expect(result).toBe(false)
		})
	})
})
