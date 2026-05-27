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
		enableLocalEvaluation: false,
	})
	return instance
}

/**
 * Returns a serialized IState-compatible JSON string for use with @flagsmith/flagsmith FlagsmithProvider.
 * When `identity` is provided, evaluates flags for that specific user (respects identity overrides
 * and segment rules). Falls back to environment-level flags when no identity is given.
 * FLAGSMITH_SERVER_KEY is used only on the server and MUST NOT appear in the client bundle.
 */
export async function getFlagsmithServerState(
	identity?: string
): Promise<FlagsmithServerState> {
	const fs = getInstance()
	const flagsObj = identity
		? await fs.getIdentityFlags(identity)
		: await fs.getEnvironmentFlags()

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
 *
 * When `identity` is provided, Flagsmith evaluates the flag for that specific
 * user — respecting identity overrides and segment rules configured in the
 * Flagsmith dashboard. Falls back to the environment-level value when no
 * identity is given.
 */
export async function isFeatureEnabledServer(
	flag: FeatureFlag,
	identity?: string
): Promise<boolean> {
	const fs = getInstance()
	const flagsObj = identity
		? await fs.getIdentityFlags(identity)
		: await fs.getEnvironmentFlags()
	const entry = flagsObj.flags[flag]
	return entry?.enabled ?? false
}
