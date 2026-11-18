/**
 * The [Skill Manifest](../GLOSSARY.md): `skills.manifest.json` at the repository root, the allowlist
 * of the Customer Skills this repository publishes and the one authored place a CLI Range lives.
 */
import { cliFloor } from "./cli-range"

/** One published Customer Skill: its name, the directory it lives in and the CLI Range it expects. */
export type ManifestRow = { name: string; path: string; cliRange: string }

/** The published set, in install order. */
export type SkillManifest = { formatVersion: number; skills: ManifestRow[] }

/** The manifest's path from the repository root. */
export const MANIFEST_PATH = "skills.manifest.json"

/** The one format version this repository reads and writes. */
export const FORMAT_VERSION = 1

/** A Skill name and the directory under `skills/`: lowercase words joined by single hyphens. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The manifest as written, refusing anything that is not the documented shape. */
export function parseSkillManifest(source: string, path = MANIFEST_PATH): SkillManifest {
	let parsed: unknown
	try {
		parsed = JSON.parse(source)
	} catch {
		throw new Error(`${path} is not JSON`)
	}
	if (typeof parsed !== "object" || parsed === null) throw new Error(`${path} is not an object`)
	const { formatVersion, skills } = parsed as { formatVersion?: unknown; skills?: unknown }
	if (typeof formatVersion !== "number") throw new Error(`${path} has no numeric formatVersion`)
	if (!Array.isArray(skills)) throw new Error(`${path} has no skills array`)
	return {
		formatVersion,
		skills: skills.map((row: unknown, index) => rowOf(row, `${path}: skills[${index}]`)),
	}
}

/** One row, refusing a missing or mistyped field by the path a reader can find it at. */
function rowOf(row: unknown, where: string): ManifestRow {
	if (typeof row !== "object" || row === null) throw new Error(`${where} is not an object`)
	const { name, path, cliRange } = row as Record<string, unknown>
	for (const [field, value] of Object.entries({ name, path, cliRange })) {
		if (typeof value !== "string" || value === "") throw new Error(`${where} has no ${field}`)
	}
	return { name: name as string, path: path as string, cliRange: cliRange as string }
}

/** Every rule the manifest and the `skills/` directory tree must agree on, as plain sentences. */
export function manifestProblems(
	manifest: SkillManifest,
	directories: readonly string[],
): string[] {
	return [
		...formatProblems(manifest),
		...duplicateProblems(manifest.skills),
		...manifest.skills.flatMap((row) => rowProblems(row, directories)),
		...unlistedDirectories(manifest.skills, directories),
	]
}

/** The manifest as a whole: one documented format version, and at least one published Skill. */
function formatProblems(manifest: SkillManifest): string[] {
	const problems: string[] = []
	if (manifest.formatVersion !== FORMAT_VERSION) {
		problems.push(`formatVersion ${manifest.formatVersion} is not ${FORMAT_VERSION}`)
	}
	if (manifest.skills.length === 0) problems.push("the manifest lists no Skill")
	return problems
}

/** A name or a directory listed twice, which would publish one Skill two ways. */
function duplicateProblems(rows: readonly ManifestRow[]): string[] {
	const problems: string[] = []
	const names = new Set<string>()
	const paths = new Set<string>()
	for (const row of rows) {
		if (names.has(row.name)) problems.push(`"${row.name}" is listed twice`)
		names.add(row.name)
		if (paths.has(row.path)) problems.push(`"${row.path}" is listed twice`)
		paths.add(row.path)
	}
	return problems
}

/** One row: a usable name, the directory that name implies, its range, and a directory to live in. */
function rowProblems(row: ManifestRow, directories: readonly string[]): string[] {
	const problems: string[] = []
	if (!SKILL_NAME.test(row.name)) problems.push(`"${row.name}" is not a Skill name`)
	if (row.path !== `skills/${row.name}`) {
		problems.push(`"${row.name}" lives at "${row.path}", not "skills/${row.name}"`)
	}
	try {
		cliFloor(row.cliRange)
	} catch (error) {
		const reason = (error as Error).message
		problems.push(`"${row.name}" states no usable CLI Range: ${reason}`)
	}
	if (!directories.includes(row.name)) {
		problems.push(`"${row.name}" has a manifest row but no skills/${row.name} directory`)
	}
	return problems
}

/** A directory under `skills/` with no row, which publishes nothing and is a Skill nobody declared. */
function unlistedDirectories(
	rows: readonly ManifestRow[],
	directories: readonly string[],
): string[] {
	return directories
		.filter((directory) => !rows.some((row) => row.name === directory))
		.map((directory) => `skills/${directory} has no manifest row, so nothing publishes it`)
}
