/** Prisma's PostgreSQL case-insensitive equality uses an ILIKE pattern. */
export function escapeLikePattern(value: string): string {
	return value.replace(/[\\%_]/g, '\\$&')
}
