/**
 * The `skills-lock.json` of a scratch install, against the manifest that install was meant to leave
 * behind. `scripts/check-skills-install.sh` calls it; the rules are `scripts/skills-lock.ts`.
 *
 *   bun scripts/check-skills-lock.ts <project> <source> <commit|-> <manifest>
 */
import { existsSync, readFileSync, realpathSync } from "node:fs"
import { join } from "node:path"
import { skillFolderHash } from "./skill-folder-hash"
import { lockProblems, parseSkillsLock, type SkillsLock } from "./skills-lock"
import { parseSkillManifest } from "./skills-manifest"

const USAGE = "usage: bun scripts/check-skills-lock.ts <project> <source> <commit|-> <manifest>"

/** One command-line argument, refusing a run that left it out. */
function arg(at: number): string {
	const value = process.argv[at]
	if (value === undefined) throw new Error(USAGE)
	return value
}

const project = arg(2)
const source = arg(3)
const commit = arg(4)
const manifestPath = arg(5)
const lock = parseSkillsLock(readFileSync(join(project, "skills-lock.json"), "utf8"))
const manifest = parseSkillManifest(readFileSync(manifestPath, "utf8"), manifestPath)

/** The path a recorded source names, resolved from the project the lock belongs to. */
function canonical(recorded: string): string {
	const path = join(project, recorded)
	if (!existsSync(path)) return recorded
	return realpathSync(path)
}

canonicalise(lock)

const problems = lockProblems(lock, {
	names: manifest.skills.map((row) => row.name),
	source: canonical(source),
	commit: commit === "-" ? null : commit,
	hashFor: (name) => {
		const directory = join(project, ".agents/skills", name)
		return existsSync(directory) ? skillFolderHash(directory) : null
	},
})
if (problems.length > 0) {
	for (const problem of problems) console.error(problem)
	process.exit(1)
}

/** Rewrites every entry's source to the path it names, so a local install compares by directory. */
function canonicalise(lock: SkillsLock): void {
	for (const entry of Object.values(lock.skills ?? {})) {
		if (entry.source !== undefined) entry.source = canonical(entry.source)
	}
}
