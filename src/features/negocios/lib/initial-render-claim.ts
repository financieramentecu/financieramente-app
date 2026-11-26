const claimed = new Set<string>()

/**
 * True the first time a server render's data is mounted in this tab. A later
 * mount of the same render (router cache restore on back/forward) returns
 * false, so the hook revalidates instead of trusting stale data.
 */
export function claimInitialRender(key: string): boolean {
	if (claimed.has(key)) return false
	claimed.add(key)
	return true
}

export interface InitialData<T> {
	data: T
	/** Unique id of the server render that produced `data`. */
	renderId: string
}
