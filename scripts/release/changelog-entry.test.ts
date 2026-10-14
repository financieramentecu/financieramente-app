import { describe, expect, it } from 'vitest'
import {
	buildChangelogEntry,
	ChangesetParseError,
	formatBogotaDate,
	insertChangelogEntry,
	mergeChangesetSections,
	parseChangeset,
} from './changelog-entry'

const frontmatter = '---\n"financieramente-app": minor\n---\n'

describe('parseChangeset', () => {
	it('strips the frontmatter and groups bullets under their headings', () => {
		const content = `${frontmatter}\n### Agregado\n\n- New report\n- New filter\n\n### Técnico\n\n- New service\n`

		const result = parseChangeset('a.md', content)

		expect(result.sections).toEqual({
			Agregado: ['- New report', '- New filter'],
			Mejorado: [],
			Corregido: [],
			Técnico: ['- New service'],
		})
	})

	it('matches headings case-insensitively', () => {
		const content = `${frontmatter}### agregado\n- One\n### CORREGIDO\n- Two\n`

		const result = parseChangeset('a.md', content)

		expect(result.sections.Agregado).toEqual(['- One'])
		expect(result.sections.Corregido).toEqual(['- Two'])
	})

	it('accepts "Tecnico" without the accent', () => {
		const content = `${frontmatter}### Tecnico\n- Refactor\n`

		const result = parseChangeset('a.md', content)

		expect(result.sections.Técnico).toEqual(['- Refactor'])
	})

	it('preserves indented continuation lines of multi-line bullets', () => {
		const content = `${frontmatter}### Mejorado\n- First line\n  second line\n    - nested item\n- Other\n`

		const result = parseChangeset('a.md', content)

		expect(result.sections.Mejorado).toEqual([
			'- First line\n  second line\n    - nested item',
			'- Other',
		])
	})

	it('keeps blank lines that sit inside a multi-line bullet', () => {
		const content = `${frontmatter}### Mejorado\n- First paragraph\n\n  Second paragraph\n\n- Other\n`

		const result = parseChangeset('a.md', content)

		expect(result.sections.Mejorado).toEqual([
			'- First paragraph\n\n  Second paragraph',
			'- Other',
		])
	})

	it('throws naming the file when a heading is unknown', () => {
		const content = `${frontmatter}### Minor Changes\n- Something\n`

		expect(() => parseChangeset('brave-cat.md', content)).toThrow(
			ChangesetParseError
		)
		expect(() => parseChangeset('brave-cat.md', content)).toThrow(
			/brave-cat\.md/
		)
		expect(() => parseChangeset('brave-cat.md', content)).toThrow(
			/Minor Changes/
		)
	})

	it('throws when a heading uses a level other than ###', () => {
		const content = `${frontmatter}## Agregado\n- Something\n`

		expect(() => parseChangeset('a.md', content)).toThrow(/a\.md/)
	})

	it('throws when content appears before any allowed heading', () => {
		const content = `${frontmatter}Some loose summary\n### Agregado\n- Something\n`

		expect(() => parseChangeset('loose.md', content)).toThrow(/loose\.md/)
	})

	it('throws when a bullet appears before any heading', () => {
		const content = `${frontmatter}- Orphan bullet\n`

		expect(() => parseChangeset('orphan.md', content)).toThrow(/orphan\.md/)
	})

	it('throws when a non-bullet line appears inside a section', () => {
		const content = `${frontmatter}### Agregado\n- Something\nLoose paragraph\n`

		expect(() => parseChangeset('stray.md', content)).toThrow(/stray\.md/)
	})

	it('throws when a changeset that declares a release has an empty body', () => {
		expect(() => parseChangeset('empty.md', `${frontmatter}\n\n`)).toThrow(
			/empty\.md/
		)
	})

	it('throws when the body has headings but no bullets', () => {
		expect(() =>
			parseChangeset('nobullets.md', `${frontmatter}### Agregado\n\n`)
		).toThrow(/nobullets\.md/)
	})

	it('treats an empty changeset (no releases, no body) as contributing nothing', () => {
		const result = parseChangeset('empty-release.md', '---\n---\n')

		expect(result.isEmpty).toBe(true)
		expect(result.sections).toEqual({
			Agregado: [],
			Mejorado: [],
			Corregido: [],
			Técnico: [],
		})
	})

	it('throws when the frontmatter is missing', () => {
		expect(() =>
			parseChangeset('nofm.md', '### Agregado\n- Something\n')
		).toThrow(/nofm\.md/)
	})
})

describe('mergeChangesetSections', () => {
	it('concatenates bullets per section in the given order', () => {
		const first = parseChangeset(
			'a.md',
			`${frontmatter}### Agregado\n- A1\n### Técnico\n- T1\n`
		)
		const second = parseChangeset(
			'b.md',
			`${frontmatter}### Agregado\n- B1\n### Corregido\n- C1\n`
		)

		const merged = mergeChangesetSections([first, second])

		expect(merged).toEqual({
			Agregado: ['- A1', '- B1'],
			Mejorado: [],
			Corregido: ['- C1'],
			Técnico: ['- T1'],
		})
	})
})

describe('buildChangelogEntry', () => {
	it('renders the header and sections in the fixed order, omitting empty ones', () => {
		const entry = buildChangelogEntry({
			version: '1.37.0',
			date: '2026-10-08',
			sections: {
				Agregado: ['- Added'],
				Mejorado: [],
				Corregido: ['- Fixed'],
				Técnico: ['- Tech'],
			},
		})

		expect(entry).toBe(
			[
				'## [1.37.0] - 2026-10-08',
				'',
				'### Agregado',
				'',
				'- Added',
				'',
				'### Corregido',
				'',
				'- Fixed',
				'',
				'### Técnico',
				'',
				'- Tech',
				'',
			].join('\n')
		)
	})

	it('throws when every section is empty', () => {
		expect(() =>
			buildChangelogEntry({
				version: '1.37.0',
				date: '2026-10-08',
				sections: { Agregado: [], Mejorado: [], Corregido: [], Técnico: [] },
			})
		).toThrow()
	})
})

describe('insertChangelogEntry', () => {
	const intro = '# Changelog\n\nIntro text.\n\n'
	const entry = '## [1.37.0] - 2026-10-08\n\n### Agregado\n\n- Added\n'

	it('inserts the entry right before the first version header', () => {
		const changelog = `${intro}## [1.36.0] - 2026-10-01\n\n### Agregado\n\n- Old\n`

		const result = insertChangelogEntry(changelog, entry, '1.37.0')

		expect(result).toBe(
			`${intro}${entry}\n## [1.36.0] - 2026-10-01\n\n### Agregado\n\n- Old\n`
		)
	})

	it('appends the entry after the intro when no version header exists', () => {
		const result = insertChangelogEntry(
			'# Changelog\n\nIntro text.\n',
			entry,
			'1.37.0'
		)

		expect(result).toBe(`# Changelog\n\nIntro text.\n\n${entry}`)
	})

	it('throws when the version header already exists', () => {
		const changelog = `${intro}## [1.37.0] - 2026-10-01\n\n- Old\n`

		expect(() => insertChangelogEntry(changelog, entry, '1.37.0')).toThrow(
			/1\.37\.0/
		)
	})

	it('does not confuse a version that is a prefix of an existing one', () => {
		const changelog = `${intro}## [1.37.01] - 2026-10-01\n\n- Old\n`

		expect(() => insertChangelogEntry(changelog, entry, '1.37.0')).not.toThrow()
	})
})

describe('formatBogotaDate', () => {
	it('uses the America/Bogota calendar day, not UTC', () => {
		expect(formatBogotaDate(new Date('2026-10-09T03:00:00Z'))).toBe(
			'2026-10-08'
		)
	})

	it('returns the same day when Bogota and UTC agree', () => {
		expect(formatBogotaDate(new Date('2026-10-09T15:00:00Z'))).toBe(
			'2026-10-09'
		)
	})
})
