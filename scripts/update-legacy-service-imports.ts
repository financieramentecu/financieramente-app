import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const LEGACY_TO_TARGET = {
	'@/services/company.service': '@/features/admin/companies/lib/company-api',
	'@/services/currency.service': '@/features/admin/currencies/lib/currency-api',
	'@/services/origin.service': '@/features/admin/origins/lib/origin-api',
	'@/services/periodicity.service': '@/features/admin/periodicities/lib/periodicity-api',
	'@/services/product.service': '@/features/admin/products/lib/product-api',
} as const

type LegacyImportPath = keyof typeof LEGACY_TO_TARGET

const LEGACY_SYMBOL_TO_TARGET = {
	getCompanies: { importPath: LEGACY_TO_TARGET['@/services/company.service'], exportName: 'companyApi' },
	getCurrencies: { importPath: LEGACY_TO_TARGET['@/services/currency.service'], exportName: 'currencyApi' },
	getClientOrigins: { importPath: LEGACY_TO_TARGET['@/services/origin.service'], exportName: 'originApi' },
	getPeriodicities: {
		importPath: LEGACY_TO_TARGET['@/services/periodicity.service'],
		exportName: 'periodicityApi',
	},
	getProducts: { importPath: LEGACY_TO_TARGET['@/services/product.service'], exportName: 'productApi' },
} as const

type LegacySymbol = keyof typeof LEGACY_SYMBOL_TO_TARGET

const SRC_ROOT_DIRNAME = 'src' as const
const INCLUDED_EXTENSIONS = ['.ts', '.tsx'] as const

function parseArgs(argv: readonly string[]) {
	const args = new Set(argv)
	const dryRun = args.has('--dry-run') || args.has('-n')
	const write = args.has('--write')
	const help = args.has('--help') || args.has('-h')

	// If neither provided: default to dry-run.
	const effectiveDryRun = write ? false : dryRun || !write

	return { dryRun: effectiveDryRun, help }
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function listSourceFiles(repoRoot: string) {
	const srcRoot = path.join(repoRoot, SRC_ROOT_DIRNAME)
	const out: string[] = []

	async function walk(dir: string) {
		const entries = await readdir(dir, { withFileTypes: true })
		for (const entry of entries) {
			if (entry.isSymbolicLink()) continue

			const fullPath = path.join(dir, entry.name)
			if (entry.isDirectory()) {
				if (entry.name === 'node_modules' || entry.name === '.next') continue
				await walk(fullPath)
				continue
			}

			if (!entry.isFile()) continue
			const ext = path.extname(entry.name)
			if (!INCLUDED_EXTENSIONS.includes(ext as (typeof INCLUDED_EXTENSIONS)[number]))
				continue
			out.push(fullPath)
		}
	}

	await walk(srcRoot)
	return out
}

function buildNamedImportRegex(importPath: string) {
	// Matches:
	// import { a, b as c } from '...'
	// import type { a } from "..."
	// Captures the import list inside { }.
	return new RegExp(
		`^\\s*import\\s+(?:type\\s+)?\\{\\s*([^}]*)\\s*\\}\\s*from\\s*['"]${escapeRegExp(importPath)}['"]\\s*;?\\s*$`,
		'm'
	)
}

function splitImportSpecifiers(list: string) {
	return list
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
}

function parseSpecifier(spec: string): { imported: string; local: string } | null {
	// "foo" or "foo as bar"
	const parts = spec.split(/\s+as\s+/).map((s) => s.trim())
	if (parts.length === 1) return { imported: parts[0], local: parts[0] }
	if (parts.length === 2) return { imported: parts[0], local: parts[1] }
	return null
}

function applyEditsForLegacyImport(params: {
	source: string
	legacyImportPath: LegacyImportPath
}): { nextSource: string; changed: boolean; summary: string[] } {
	const { source, legacyImportPath } = params
	const targetImportPath = LEGACY_TO_TARGET[legacyImportPath]

	const importRegex = buildNamedImportRegex(legacyImportPath)
	const match = source.match(importRegex)
	if (!match) return { nextSource: source, changed: false, summary: [] }

	const importListRaw = match[1] ?? ''
	const specs = splitImportSpecifiers(importListRaw)
	const parsed = specs
		.map(parseSpecifier)
		.filter((x): x is NonNullable<typeof x> => x !== null)

	const rewrites: Array<{
		legacyLocalName: string
		targetNamespace: string
		targetMethod: string
	}> = []

	for (const p of parsed) {
		const imported = p.imported as LegacySymbol
		if (!(imported in LEGACY_SYMBOL_TO_TARGET)) continue

		const target = LEGACY_SYMBOL_TO_TARGET[imported]
		// safety: only rewrite if this import path matches the expected one for the symbol
		if (target.importPath !== targetImportPath) continue

		rewrites.push({
			legacyLocalName: p.local,
			targetNamespace: target.exportName,
			targetMethod: imported,
		})
	}

	if (rewrites.length === 0) {
		return { nextSource: source, changed: false, summary: [] }
	}

	// Replace the import line with a namespace import of the api object.
	// Example:
	// import { getCompanies } from '@/services/company.service'
	// =>
	// import { companyApi } from '@/features/admin/companies/lib/company-api'
	const apiExportName = rewrites[0]?.targetNamespace
	const newImportLine = `import { ${apiExportName} } from '${targetImportPath}'`

	let next = source.replace(importRegex, newImportLine)

	// Replace usages:
	// getCompanies(...) => companyApi.getCompanies(...)
	// This is best-effort and intentionally simple for Phase 1.
	for (const r of rewrites) {
		const callRegex = new RegExp(`\\b${escapeRegExp(r.legacyLocalName)}\\s*\\(`, 'g')
		next = next.replace(callRegex, `${r.targetNamespace}.${r.targetMethod}(`)
	}

	const summary = rewrites.map(
		(r) => `${legacyImportPath}: ${r.legacyLocalName} -> ${r.targetNamespace}.${r.targetMethod}(...)`
	)
	return { nextSource: next, changed: next !== source, summary }
}

async function main() {
	const { dryRun, help } = parseArgs(process.argv.slice(2))

	if (help) {
		console.log(
			[
				'update-legacy-service-imports',
				'',
				'Usage:',
				'  tsx scripts/update-legacy-service-imports.ts --dry-run',
				'  tsx scripts/update-legacy-service-imports.ts --write',
				'',
				'Options:',
				'  --dry-run, -n   Do not write changes (default)',
				'  --write         Write changes to disk',
				'  --help, -h      Show help',
			].join('\n')
		)
		return
	}

	const repoRoot = process.cwd()
	const files = await listSourceFiles(repoRoot)

	const changedFiles: Array<{
		file: string
		edits: string[]
	}> = []

	for (const file of files) {
		const raw = await readFile(file, 'utf8')
		let next = raw
		const edits: string[] = []

		for (const legacyPath of Object.keys(LEGACY_TO_TARGET) as LegacyImportPath[]) {
			const res = applyEditsForLegacyImport({ source: next, legacyImportPath: legacyPath })
			next = res.nextSource
			edits.push(...res.summary)
		}

		if (next !== raw) {
			changedFiles.push({ file: path.relative(repoRoot, file), edits })
			if (!dryRun) {
				await writeFile(file, next, 'utf8')
			}
		}
	}

	console.log(
		[
			`Mode: ${dryRun ? 'dry-run' : 'write'}`,
			`Files scanned: ${files.length}`,
			`Files changed: ${changedFiles.length}`,
			'',
			...changedFiles.flatMap((f) => [
				`- ${f.file}`,
				...f.edits.map((e) => `  - ${e}`),
			]),
		].join('\n')
	)
}

main().catch((err: unknown) => {
	console.error(err)
	process.exitCode = 1
})

