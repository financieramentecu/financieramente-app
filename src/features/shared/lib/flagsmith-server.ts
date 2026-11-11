import 'server-only'
import { cache } from 'react'
import { Flagsmith } from 'flagsmith-nodejs'
import { ALL_FEATURE_FLAGS } from '@/features/shared/types/feature-flags.types'
import type { FeatureFlag, FlagsmithServerState } from '@/features/shared/types/feature-flags.types'

const FLAGSMITH_API_URL = 'https://edge.api.flagsmith.com/api/v1/'

const FALLBACK_FLAGS: Record<FeatureFlag, boolean> = {
	negocios_advanced_filters: false,
	dashboard_calculadora: true,
	impersonation_select: false,
	production_dashboard: true,
	leads_module: true,
	reportes_produccion_real: true,
	reportes_leads_analytics: true,
	reportes_aba_mfund: true,
	crm_timeline: false,
	crm_tasks: false,
	crm_cases: false,
	crm_conversion_audit: false,
	crm_imports: false,
	crm_reports: false,
	crm_lead_table: false,
	crm_lead_fields: false,
}

const CRM_FEATURE_FLAGS = new Set<FeatureFlag>([
	'crm_timeline',
	'crm_tasks',
	'crm_cases',
	'crm_conversion_audit',
	'crm_imports',
	'crm_reports',
	'crm_lead_table',
	'crm_lead_fields',
])

/**
 * Allows a developer to exercise selected, default-off CRM surfaces locally
 * without changing the rollout state in Flagsmith. This is intentionally
 * ignored outside `development` and only accepts known CRM flags.
 */
function getLocalCrmOverrides(): Set<FeatureFlag> {
	if (process.env.NODE_ENV !== 'development') return new Set()

	return new Set(
		(process.env.LOCAL_CRM_FEATURE_FLAGS ?? '')
			.split(',')
			.map((flag) => flag.trim())
			.filter((flag): flag is FeatureFlag => CRM_FEATURE_FLAGS.has(flag as FeatureFlag))
	)
}

let instance: Flagsmith | null = null

function getInstance(): Flagsmith {
	if (instance) return instance
	const environmentKey = process.env.FLAGSMITH_SERVER_KEY
	if (!environmentKey) throw new Error('FLAGSMITH_SERVER_KEY is not set')
	instance = new Flagsmith({
		environmentKey,
		enableLocalEvaluation: true,
		environmentRefreshIntervalSeconds: 300,
	})
	return instance
}

/**
 * One Flagsmith read per request and identity. The layout and the page guards
 * of the same render share it; an empty identity reads environment flags.
 */
const readRemoteFlags = cache(async (identity: string) => {
	const client = getInstance()
	return identity ? client.getIdentityFlags(identity) : client.getEnvironmentFlags()
})

function getFallbackState(): FlagsmithServerState {
	const flags = Object.fromEntries(
		ALL_FEATURE_FLAGS.map((key) => [key, { enabled: FALLBACK_FLAGS[key], value: null }])
	)
	return JSON.stringify({ api: FLAGSMITH_API_URL, flags })
}

function getDevStubState(): FlagsmithServerState {
	const localCrmOverrides = getLocalCrmOverrides()
	const flags = Object.fromEntries(
		ALL_FEATURE_FLAGS.map((key) => [
			key,
			{
				enabled: !CRM_FEATURE_FLAGS.has(key) || localCrmOverrides.has(key),
				value: null,
			},
		])
	)
	return JSON.stringify({ api: FLAGSMITH_API_URL, flags })
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
	if (process.env.NODE_ENV === 'development') return getDevStubState()
	// No key configured (e.g. QA) → all flags enabled for testing, zero Flagsmith requests.
	if (!process.env.FLAGSMITH_SERVER_KEY) return getDevStubState()
	try {
		const flagsObj = await readRemoteFlags(identity ?? '')

		// Convert flagsmith-nodejs Flags to @flagsmith/flagsmith IState shape
		const clientFlags: Record<string, { id?: number; enabled: boolean; value: string | number | boolean | null }> = {}
		for (const [name, flag] of Object.entries(flagsObj.flags)) {
			clientFlags[name] = {
				id: flag.featureId,
				enabled: flag.enabled,
				value: flag.value ?? null,
			}
		}

		for (const name of ALL_FEATURE_FLAGS) {
			if (!(name in clientFlags)) {
				clientFlags[name] = {
					enabled: FALLBACK_FLAGS[name],
					value: null,
				}
			}
		}

		return JSON.stringify({ api: FLAGSMITH_API_URL, flags: clientFlags })
	} catch {
		return getFallbackState()
	}
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
	if (process.env.NODE_ENV === 'development') return true
	// QA keeps legacy flags available without a key, but CRM additions are
	// explicitly default-off until their Flagsmith rollout is configured.
	if (!process.env.FLAGSMITH_SERVER_KEY) {
		return CRM_FEATURE_FLAGS.has(flag) ? FALLBACK_FLAGS[flag] : true
	}
	try {
		const flagsObj = await readRemoteFlags(identity ?? '')
		const entry = flagsObj.flags[flag]
		return entry?.enabled ?? FALLBACK_FLAGS[flag]
	} catch {
		return FALLBACK_FLAGS[flag]
	}
}
