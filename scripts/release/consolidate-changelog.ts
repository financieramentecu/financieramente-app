/**
 * Release helper: consolidates every pending changeset into ONE CHANGELOG.md
 * entry (project format) and bumps the version through `changeset version`.
 *
 * Usage:
 *   npm run release:version              # write CHANGELOG.md, bump version, consume changesets
 *   npm run release:version -- --dry-run # print the new version and entry, change nothing
 */
import { execFileSync } from 'node:child_process'
import {
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
	buildChangelogEntry,
	formatBogotaDate,
	insertChangelogEntry,
	mergeChangesetSections,
	parseChangeset,
	type ParsedChangeset,
} from './changelog-entry'

const PACKAGE_NAME = 'financieramente-app'
const ROOT_DIR = process.cwd()
const CHANGESET_DIR = path.join(ROOT_DIR, '.changeset')
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md')
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json')
const PACKAGE_LOCK_PATH = path.join(ROOT_DIR, 'package-lock.json')

interface StatusRelease {
	readonly name: string
	readonly newVersion: string
}

interface StatusOutput {
	readonly releases: readonly StatusRelease[]
}

function fail(message: string): never {
	console.error(`\n✖ release:version aborted: ${message}\n`)
	process.exit(1)
}

function readPendingChangesets(): ParsedChangeset[] {
	if (!existsSync(CHANGESET_DIR))
		fail('the .changeset directory does not exist')

	const fileNames = readdirSync(CHANGESET_DIR)
		.filter(
			(name) => name.endsWith('.md') && name.toLowerCase() !== 'readme.md'
		)
		.sort()

	if (fileNames.length === 0) fail('no pending changesets found in .changeset/')

	return fileNames.map((fileName) =>
		parseChangeset(
			fileName,
			readFileSync(path.join(CHANGESET_DIR, fileName), 'utf8')
		)
	)
}

function runChangeset(args: readonly string[]): void {
	execFileSync('npx', ['changeset', ...args], {
		cwd: ROOT_DIR,
		stdio: 'inherit',
	})
}

function resolveNewVersion(): string {
	const tempDir = mkdtempSync(path.join(tmpdir(), 'changeset-status-'))
	const outputPath = path.join(tempDir, 'status.json')
	try {
		runChangeset(['status', `--output=${outputPath}`])
		const status = JSON.parse(readFileSync(outputPath, 'utf8')) as StatusOutput
		const release = status.releases.find((item) => item.name === PACKAGE_NAME)
		if (!release?.newVersion) {
			fail(
				`changeset status did not report a new version for "${PACKAGE_NAME}"`
			)
		}
		return release.newVersion
	} finally {
		rmSync(tempDir, { recursive: true, force: true })
	}
}

function readPackageVersion(): string {
	const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')) as {
		version: string
	}
	return packageJson.version
}

function syncPackageLockVersion(version: string): void {
	if (!existsSync(PACKAGE_LOCK_PATH)) return
	const lock = JSON.parse(readFileSync(PACKAGE_LOCK_PATH, 'utf8')) as {
		version?: string
		packages?: Record<string, { version?: string }>
	}
	lock.version = version
	const rootPackage = lock.packages?.['']
	if (rootPackage) rootPackage.version = version
	writeFileSync(PACKAGE_LOCK_PATH, `${JSON.stringify(lock, null, '\t')}\n`)
}

function main(): void {
	const isDryRun = process.argv.includes('--dry-run')
	const previousVersion = readPackageVersion()

	let changesets: ParsedChangeset[]
	try {
		changesets = readPendingChangesets()
	} catch (error) {
		fail(error instanceof Error ? error.message : String(error))
	}

	const newVersion = resolveNewVersion()
	const entry = buildChangelogEntry({
		version: newVersion,
		date: formatBogotaDate(new Date()),
		sections: mergeChangesetSections(changesets),
	})
	const originalChangelog = readFileSync(CHANGELOG_PATH, 'utf8')

	let updatedChangelog: string
	try {
		updatedChangelog = insertChangelogEntry(
			originalChangelog,
			entry,
			newVersion
		)
	} catch (error) {
		fail(error instanceof Error ? error.message : String(error))
	}

	if (isDryRun) {
		console.log(
			`\n[dry-run] ${previousVersion} → ${newVersion} (${changesets.length} changeset(s))`
		)
		console.log(
			`[dry-run] Entry that would be added to CHANGELOG.md:\n\n${entry}`
		)
		console.log('[dry-run] Nothing was written.')
		return
	}

	writeFileSync(CHANGELOG_PATH, updatedChangelog)
	try {
		runChangeset(['version'])
	} catch (error) {
		writeFileSync(CHANGELOG_PATH, originalChangelog)
		fail(
			`"changeset version" failed; CHANGELOG.md was restored. ${error instanceof Error ? error.message : String(error)}`
		)
	}

	const bumpedVersion = readPackageVersion()
	if (bumpedVersion !== newVersion) {
		console.warn(
			`⚠ package.json version is ${bumpedVersion} but the CHANGELOG entry uses ${newVersion}; review before committing.`
		)
	}
	syncPackageLockVersion(bumpedVersion)

	console.log(`\n✔ Release prepared: ${previousVersion} → ${bumpedVersion}`)
	console.log(`  Changesets consumed: ${changesets.length}`)
	console.log('\nNext steps:')
	console.log(
		'  1. Review the diff (CHANGELOG.md, package.json, package-lock.json, .changeset/).'
	)
	console.log(`  2. Commit: git commit -am "chore(release): v${bumpedVersion}"`)
	console.log('  3. Open a PR develop → main and merge it.')
	console.log(
		`  4. After merging, tag main: git tag v${bumpedVersion} && git push origin v${bumpedVersion}`
	)
}

main()
