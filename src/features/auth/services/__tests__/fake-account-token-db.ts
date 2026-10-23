/**
 * In-memory stand-in for the Prisma `accountToken` / `user` delegates used by
 * the account services. It implements only the `where` shapes the services
 * emit, with the same all-or-nothing semantics per call (each call evaluates
 * and mutates synchronously, like a single atomic UPDATE statement).
 */
export interface FakeUser {
	idUser: number
	active: boolean
	activatedAt: Date | null
	ssoOnly: boolean
	password: string | null
	email: string | null
	roleCode?: string
}

export interface FakeToken {
	id: number
	idUser: number
	type: 'ACTIVATION' | 'RESET'
	tokenHash: string
	expiresAt: Date
	usedAt: Date | null
	revokedAt: Date | null
	createdAt: Date
}

type Where = Record<string, unknown>

export function createFakeDb(initialUsers: FakeUser[]) {
	const users = new Map(initialUsers.map((u) => [u.idUser, { ...u }]))
	const tokens: FakeToken[] = []
	let nextId = 1
	let transactionCalls = 0
	let queue: Promise<void> = Promise.resolve()

	function matches(token: FakeToken, where: Where): boolean {
		if ('tokenHash' in where && token.tokenHash !== where.tokenHash)
			return false
		if ('idUser' in where && token.idUser !== where.idUser) return false
		if ('type' in where && token.type !== where.type) return false
		if ('usedAt' in where && where.usedAt === null && token.usedAt !== null)
			return false
		if (
			'revokedAt' in where &&
			where.revokedAt === null &&
			token.revokedAt !== null
		)
			return false
		const expiresAt = where.expiresAt as { gt?: Date } | undefined
		if (expiresAt?.gt && !(token.expiresAt > expiresAt.gt)) return false
		const user = where.user as { active?: boolean } | undefined
		if (
			user?.active !== undefined &&
			users.get(token.idUser)?.active !== user.active
		)
			return false
		return true
	}

	const accountToken = {
		create: async ({
			data,
		}: {
			data: Omit<FakeToken, 'id' | 'createdAt' | 'usedAt' | 'revokedAt'>
		}) => {
			const row: FakeToken = {
				id: nextId++,
				usedAt: null,
				revokedAt: null,
				createdAt: new Date(),
				...data,
			}
			tokens.push(row)
			return row
		},
		findUnique: async ({ where }: { where: { tokenHash: string } }) =>
			tokens.find((t) => t.tokenHash === where.tokenHash) ?? null,
		findFirst: async ({ where }: { where: Where }) =>
			tokens.find((t) => matches(t, where)) ?? null,
		updateMany: async ({
			where,
			data,
		}: {
			where: Where
			data: Partial<FakeToken>
		}) => {
			const rows = tokens.filter((t) => matches(t, where))
			rows.forEach((t) => Object.assign(t, data))
			return { count: rows.length }
		},
	}

	const user = {
		findUnique: async ({ where }: { where: { idUser: number } }) =>
			users.get(where.idUser) ?? null,
		findFirst: async ({ where }: { where: { email?: { equals: string } } }) => {
			const wanted = where.email?.equals.toLowerCase()
			return (
				[...users.values()].find((u) => u.email?.toLowerCase() === wanted) ??
				null
			)
		},
		updateMany: async ({
			where,
			data,
		}: {
			where: Where
			data: Partial<FakeUser>
		}) => {
			const rows = [...users.values()].filter(
				(u) =>
					u.idUser === where.idUser &&
					(where.active === undefined || u.active === where.active) &&
					(where.activatedAt === undefined ||
						(where.activatedAt === null
							? u.activatedAt === null
							: u.activatedAt !== null)) &&
					(where.ssoOnly === undefined || u.ssoOnly === where.ssoOnly)
			)
			rows.forEach((u) => Object.assign(u, data))
			return { count: rows.length }
		},
		update: async ({
			where,
			data,
		}: {
			where: { idUser: number }
			data: Partial<FakeUser>
		}) => {
			const row = users.get(where.idUser)
			if (!row) throw new Error('not found')
			Object.assign(row, data)
			return row
		},
	}

	// A transaction client exposes the delegates but no `$transaction`.
	const txClient = { accountToken, user }

	const db = {
		accountToken,
		user,
		// Transactions run one at a time so the snapshot rollback of a failed
		// transaction cannot clobber a concurrent committed one.
		$transaction: <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
			const run = async () => runTransaction(fn)
			const result = queue.then(run, run)
			queue = result.then(
				() => undefined,
				() => undefined
			)
			return result
		},
	}

	async function runTransaction<T>(
		fn: (tx: unknown) => Promise<T>
	): Promise<T> {
		{
			transactionCalls++
			// Snapshot to emulate rollback on throw.
			const tokenSnapshot = tokens.map((t) => ({ ...t }))
			const userSnapshot = new Map([...users].map(([k, v]) => [k, { ...v }]))
			try {
				return await fn(txClient)
			} catch (error) {
				tokens.splice(0, tokens.length, ...tokenSnapshot)
				users.clear()
				userSnapshot.forEach((v, k) => users.set(k, v))
				throw error
			}
		}
	}

	return {
		db,
		tokens,
		users,
		transactionCalls: () => transactionCalls,
	}
}
