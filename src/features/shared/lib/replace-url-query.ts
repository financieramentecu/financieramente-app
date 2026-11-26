/**
 * Replaces the current URL query (e.g. `?status=EMITIDO`) without a server
 * round trip. Next.js syncs `useSearchParams` with `history.replaceState`,
 * so client state follows the URL while the Server Component is not re-run.
 * Use it for filters whose data is fetched on the client.
 */
export function replaceUrlQuery(query: string): void {
	window.history.replaceState(null, '', query)
}
