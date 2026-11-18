/**
 * `skills-lock.json` as `skills@1.9.0` writes it, and the rules `scripts/check-skills-install.sh`
 * holds it to: every published Skill recorded once, from the source and commit the check installed,
 * with a hash that matches the files the install left.
 */

/** One [Skill Pin](../GLOSSARY.md): an installed Skill's source, commit and folder hash. */
export type SkillPin = {
	source?: string
	ref?: string
	commit?: string
	sourceType?: string
	skillPath?: string
	computedHash?: string
}

/** `skills-lock.json`: every Skill Pin a scratch project holds after installing the published set. */
export type SkillsLock = { version?: number; skills?: Record<string, SkillPin> }

/** The lock as written, refusing anything that is not an object of entries. */
export function parseSkillsLock(source: string, path = "skills-lock.json"): SkillsLock {
	let parsed: unknown
	try {
		parsed = JSON.parse(source)
	} catch {
		throw new Error(`${path} is not JSON`)
	}
	if (typeof parsed !== "object" || parsed === null) throw new Error(`${path} is not an object`)
	const { skills } = parsed as { skills?: unknown }
	if (typeof skills !== "object" || skills === null) throw new Error(`${path} has no skills map`)
	return parsed as SkillsLock
}

/** What a lock must say about one installed set, and what the install actually left on disk. */
export type LockExpectation = {
	/** The Skills the manifest publishes, in install order. */
	names: readonly string[]
	/** The source every entry must name: the repository, or the path of a local checkout. */
	source: string
	/** The commit every entry must name, or null for a local source, whose lock records none. */
	commit: string | null
	/** The hash of a Skill's installed folder, or null when the install left no folder. */
	hashFor: (name: string) => string | null
}

/** Every way a lock disagrees with the set that was meant to be installed, as plain sentences. */
export function lockProblems(lock: SkillsLock, expected: LockExpectation): string[] {
	const problems: string[] = []
	const skills = lock.skills ?? {}
	for (const name of expected.names) problems.push(...entryProblems(skills[name], name, expected))
	for (const name of Object.keys(skills)) {
		if (expected.names.includes(name)) continue
		problems.push(`"${name}" is installed but the manifest lists no such Skill`)
	}
	return problems
}

/** One Skill Pin, against the source, commit and hash the install was meant to leave. */
function entryProblems(
	entry: SkillPin | undefined,
	name: string,
	expected: LockExpectation,
): string[] {
	if (entry === undefined) return [`"${name}" is not in skills-lock.json, so nothing recorded it`]
	const problems: string[] = []
	if (entry.source !== expected.source) {
		problems.push(`"${name}" records the source "${entry.source}", not "${expected.source}"`)
	}
	if (expected.commit !== null && entry.commit !== expected.commit) {
		problems.push(`"${name}" records commit "${entry.commit}", not "${expected.commit}"`)
	}
	const hash = expected.hashFor(name)
	if (hash === null) return [...problems, `"${name}" has no installed directory to hash`]
	if (entry.computedHash !== hash) {
		problems.push(
			`"${name}" records the hash "${entry.computedHash}", but the installed files hash to "${hash}"`,
		)
	}
	return problems
}
