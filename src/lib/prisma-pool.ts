/**
 * Prisma connection pool tuning
 *
 * Prisma sizes its pool as `num_cpus * 2 + 1` (5 on a 2 vCPU host) and waits
 * 10s for a free connection before failing with P2024. These helpers let the
 * deployment set the pool through non-secret environment variables instead of
 * editing the secret-bearing DATABASE_URL.
 *
 * Parameters already present in the URL always win.
 */

export interface PoolOptions {
	connectionLimit?: number
	poolTimeoutSeconds?: number
	connectTimeoutSeconds?: number
}

type EnvSource = Record<string, string | undefined>

const PARAM_BY_OPTION = [
	['connectionLimit', 'connection_limit'],
	['poolTimeoutSeconds', 'pool_timeout'],
	['connectTimeoutSeconds', 'connect_timeout'],
] as const

function isPositiveInteger(value: number | undefined): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function hasQueryParam(url: string, name: string): boolean {
	const queryStart = url.indexOf('?')
	if (queryStart === -1) return false

	return url
		.slice(queryStart + 1)
		.split('&')
		.some((pair) => pair.split('=')[0] === name)
}

/**
 * Appends the pool parameters to a connection string without re-encoding it,
 * so credentials stay byte-for-byte identical.
 */
export function withPoolParams(databaseUrl: string, options: PoolOptions): string
export function withPoolParams(
	databaseUrl: string | undefined,
	options: PoolOptions
): string | undefined
export function withPoolParams(
	databaseUrl: string | undefined,
	options: PoolOptions
): string | undefined {
	if (!databaseUrl) return databaseUrl

	let result = databaseUrl

	for (const [option, param] of PARAM_BY_OPTION) {
		const value = options[option]
		if (!isPositiveInteger(value) || hasQueryParam(result, param)) continue

		const separator = result.includes('?') ? '&' : '?'
		result = `${result}${separator}${param}=${value}`
	}

	return result
}

function parsePositiveInteger(raw: string | undefined): number | undefined {
	if (!raw || !/^\d+$/.test(raw)) return undefined

	const value = Number(raw)
	return isPositiveInteger(value) ? value : undefined
}

export function readPoolOptionsFromEnv(env: EnvSource): PoolOptions {
	const options: PoolOptions = {}

	const connectionLimit = parsePositiveInteger(env.PRISMA_CONNECTION_LIMIT)
	const poolTimeoutSeconds = parsePositiveInteger(env.PRISMA_POOL_TIMEOUT)
	const connectTimeoutSeconds = parsePositiveInteger(env.PRISMA_CONNECT_TIMEOUT)

	if (connectionLimit !== undefined) options.connectionLimit = connectionLimit
	if (poolTimeoutSeconds !== undefined) options.poolTimeoutSeconds = poolTimeoutSeconds
	if (connectTimeoutSeconds !== undefined) options.connectTimeoutSeconds = connectTimeoutSeconds

	return options
}
