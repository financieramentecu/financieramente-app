import 'server-only'
import { Flagsmith } from 'flagsmith-nodejs'
import type { FeatureFlag, FlagsmithServerState } from '@/features/shared/types/feature-flags.types'

const FLAGSMITH_API_URL = 'https://edge.api.flagsmith.com/api/v1/'

let instance: Flagsmith | null = null

function getInstance(): Flagsmith {
	if (instance) return instance
	const environmentKey = process.env.FLAGSMITH_SERVER_KEY
	if (!environmentKey) throw new Error('FLAGSMITH_SERVER_KEY is not set')
	instance = new Flagsmith({
		environmentKey,
		enableLocalEvaluation: true,
		environmentRefreshIntervalSeconds: 60,
	})
	return instance
}

/**
 * Returns a serialized IState-compatible JSON string for use with @flagsmith/flagsmith FlagsmithProvider.
 * Converts the server-side Flags object into the client SDK's IState shape.
 * FLAGSMITH_SERVER_KEY is used only on the server and MUST NOT appear in the client bundle.
 */
export async function getFlagsmithServerState(): Promise<FlagsmithServerState> {
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

	const state = {
		api: FLAGSMITH_API_URL,
		flags: clientFlags,
	}

	return JSON.stringify(state)
}

/**
 * Checks if a feature flag is enabled server-side.
 * Uses the server singleton — safe for Server Components and Route Handlers.
 */
export async function isFeatureEnabledServer(flag: FeatureFlag): Promise<boolean> {
	const fs = getInstance()
	const flagsObj = await fs.getEnvironmentFlags()
	const entry = flagsObj.flags[flag]
	return entry?.enabled ?? false
}
