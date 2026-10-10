/**
 * Pure helpers that turn pending changesets into a single CHANGELOG.md entry
 * using the project's existing format (Agregado / Mejorado / Corregido / Técnico).
 */

export const SECTION_ORDER = [
	'Agregado',
	'Mejorado',
	'Corregido',
	'Técnico',
] as const

export type ChangelogSection = (typeof SECTION_ORDER)[number]

export type ChangelogSections = Record<ChangelogSection, string[]>

export interface ParsedChangeset {
	readonly fileName: string
	readonly isEmpty: boolean
	readonly sections: ChangelogSections
}

export interface ChangelogEntryInput {
	readonly version: string
	readonly date: string
	readonly sections: ChangelogSections
}

export class ChangesetParseError extends Error {
	constructor(fileName: string, reason: string) {
		super(`Invalid changeset ".changeset/${fileName}": ${reason}`)
		this.name = 'ChangesetParseError'
	}
}

const HEADING_PATTERN = /^#{1,6}\s/
const ALLOWED_HEADING_PATTERN = /^###\s+(.+?)\s*$/
const BULLET_PATTERN = /^- /
const CONTINUATION_PATTERN = /^\s+\S/

function createEmptySections(): ChangelogSections {
	return { Agregado: [], Mejorado: [], Corregido: [], Técnico: [] }
}

function normalizeHeading(value: string): string {
	return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function resolveSection(headingText: string): ChangelogSection | undefined {
	const normalized = normalizeHeading(headingText)
	return SECTION_ORDER.find(
		(section) => normalizeHeading(section) === normalized
	)
}

interface SplitChangeset {
	readonly frontmatter: string
	readonly body: string
}

function splitFrontmatter(fileName: string, content: string): SplitChangeset {
	const normalized = content.replace(/\r\n/g, '\n')
	const match = /^---\n([\s\S]*?)\n?---[ \t]*(?:\n|$)/.exec(normalized)
	if (!match) {
		throw new ChangesetParseError(
			fileName,
			'missing YAML frontmatter (--- ... ---)'
		)
	}
	return { frontmatter: match[1], body: normalized.slice(match[0].length) }
}

function declaresReleases(frontmatter: string): boolean {
	return frontmatter.split('\n').some((line) => line.trim().length > 0)
}

export function parseChangeset(
	fileName: string,
	content: string
): ParsedChangeset {
	const { frontmatter, body } = splitFrontmatter(fileName, content)
	const sections = createEmptySections()

	if (body.trim().length === 0) {
		if (declaresReleases(frontmatter)) {
			throw new ChangesetParseError(
				fileName,
				'body is empty; add at least one section with bullets'
			)
		}
		return { fileName, isEmpty: true, sections }
	}

	let currentSection: ChangelogSection | undefined
	let currentBullet: string[] | undefined
	let pendingBlankLines = 0

	const flushBullet = () => {
		if (currentSection && currentBullet) {
			sections[currentSection].push(currentBullet.join('\n'))
		}
		currentBullet = undefined
		pendingBlankLines = 0
	}

	body.split('\n').forEach((line, index) => {
		const lineNumber = index + 1
		if (line.trim().length === 0) {
			if (currentBullet) pendingBlankLines += 1
			return
		}

		if (HEADING_PATTERN.test(line)) {
			flushBullet()
			const headingMatch = ALLOWED_HEADING_PATTERN.exec(line)
			const section = headingMatch ? resolveSection(headingMatch[1]) : undefined
			if (!section) {
				throw new ChangesetParseError(
					fileName,
					`unknown heading "${line.trim()}" at body line ${lineNumber}; allowed: ${SECTION_ORDER.map((s) => `### ${s}`).join(', ')}`
				)
			}
			currentSection = section
			return
		}

		if (BULLET_PATTERN.test(line)) {
			if (!currentSection) {
				throw new ChangesetParseError(
					fileName,
					`bullet at body line ${lineNumber} is not under an allowed ### heading`
				)
			}
			flushBullet()
			currentBullet = [line.trimEnd()]
			return
		}

		if (currentBullet && CONTINUATION_PATTERN.test(line)) {
			for (let i = 0; i < pendingBlankLines; i += 1) currentBullet.push('')
			pendingBlankLines = 0
			currentBullet.push(line.trimEnd())
			return
		}

		throw new ChangesetParseError(
			fileName,
			`unexpected content at body line ${lineNumber}: "${line.trim()}"; only "### <Section>" headings and "- " bullets are allowed`
		)
	})
	flushBullet()

	const bulletCount = SECTION_ORDER.reduce(
		(total, section) => total + sections[section].length,
		0
	)
	if (bulletCount === 0) {
		throw new ChangesetParseError(
			fileName,
			'no bullets found under any section'
		)
	}

	return { fileName, isEmpty: false, sections }
}

export function mergeChangesetSections(
	changesets: readonly ParsedChangeset[]
): ChangelogSections {
	const merged = createEmptySections()
	for (const changeset of changesets) {
		for (const section of SECTION_ORDER) {
			merged[section].push(...changeset.sections[section])
		}
	}
	return merged
}

export function buildChangelogEntry({
	version,
	date,
	sections,
}: ChangelogEntryInput): string {
	const renderedSections = SECTION_ORDER.filter(
		(section) => sections[section].length > 0
	).map((section) => [`### ${section}`, '', ...sections[section]].join('\n'))
	if (renderedSections.length === 0) {
		throw new Error(
			`Cannot build changelog entry for ${version}: no bullets in any section`
		)
	}
	return [`## [${version}] - ${date}`, ...renderedSections].join('\n\n') + '\n'
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function insertChangelogEntry(
	changelog: string,
	entry: string,
	version: string
): string {
	const duplicatePattern = new RegExp(`^## \\[${escapeRegExp(version)}\\]`, 'm')
	if (duplicatePattern.test(changelog)) {
		throw new Error(`CHANGELOG.md already contains a "## [${version}]" entry`)
	}

	const firstHeader = /^## \[/m.exec(changelog)
	if (firstHeader) {
		const before = changelog.slice(0, firstHeader.index)
		const after = changelog.slice(firstHeader.index)
		return `${before}${entry}\n${after}`
	}

	return `${changelog.trimEnd()}\n\n${entry}`
}

const bogotaDateFormatter = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'America/Bogota',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
})

export function formatBogotaDate(date: Date): string {
	return bogotaDateFormatter.format(date)
}
