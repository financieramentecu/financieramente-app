import 'server-only'
import { Flagsmith } from 'flagsmith-nodejs'
import { ALL_FEATURE_FLAGS } from '@/features/shared/types/feature-flags.types'
import type { FeatureFlag, FlagsmithServerState } from '@/features/shared/types/feature-flags.types'

const FLAGSMITH_API_URL = 'https://edge.api.flagsmith.com/api/v1/'

const FALLBACK_FLAGS: Record<FeatureFlag, boolean> = {
  negocios_advanced_filters: false,
  dashboard_simulador: true,
  impersonation_select: false,
}

let instance: Flagsmith | null = null

function getInstance(): Flagsmith {
	if (instance) return instance
	const environmentKey = process.env.FLAGSMITH_SERVER_KEY
	if (!environmentKey) throw new Error('FLAGSMITH_SERVER_KEY is not set')
	instance = new Flagsmith({
		environmentKey,
		enableLocalEvaluation: true,
		environmentRefreshIntervalSeconds: process.env.NODE_ENV === 'production' ? 1800 : 3600,
	})
	return instance
}

function getFallbackState(): FlagsmithServerState {
  const flags = Object.fromEntries(
    ALL_FEATURE_FLAGS.map((key) => [key, { enabled: FALLBACK_FLAGS[key], value: null }])
  )
  return JSON.stringify({ api: FLAGSMITH_API_URL, flags })
}

/**
 * Returns a serialized IState-compatible JSON string for use with @flagsmith/flagsmith FlagsmithProvider.
 * Converts the server-side Flags object into the client SDK's IState shape.
 * FLAGSMITH_SERVER_KEY is used only on the server and MUST NOT appear in the client bundle.
 */
function getDevStubState(): FlagsmithServerState {
  const flags = Object.fromEntries(
    ALL_FEATURE_FLAGS.map((key) => [key, { enabled: true, value: null }])
  )
  return JSON.stringify({ api: FLAGSMITH_API_URL, flags })
}

export async function getFlagsmithServerState(): Promise<FlagsmithServerState> {
	if (process.env.NODE_ENV === 'development') return getDevStubState()
	try {
		const fs = getInstance()
		const flagsObj = await fs.getEnvironmentFlags()

		// Convert flagsmith-nodejs Flags to @flagsmith/flagsmith IState shape
		const clientFlags: Record<string, { id?: number; enabled: boolean; value: string | number | boolean | null }> = {}
		for (const [name, flag] of Object.entries(flagsObj.flags)) {
			clientFlags[name] = {
				id: flag.featureId,
				enabled: flag.enabled,
				value: flag.value ?? null,
			}
		}

		return JSON.stringify({ api: FLAGSMITH_API_URL, flags: clientFlags })
	} catch {
		return getFallbackState()
	}
}

/**
 * Checks if a feature flag is enabled server-side.
 * Uses the server singleton — safe for Server Components and Route Handlers.
 */
export async function isFeatureEnabledServer(flag: FeatureFlag): Promise<boolean> {
	if (process.env.NODE_ENV === 'development') return true
	try {
		const fs = getInstance()
		const flagsObj = await fs.getEnvironmentFlags()
		const entry = flagsObj.flags[flag]
		return entry?.enabled ?? false
	} catch {
		return FALLBACK_FLAGS[flag]
	}
}
