/**
 * The stand-in for `npx` that the install-check tests run, so `bun run check` proves the check's
 * assertions without a network. `scripts/check-skills-install.sh` itself is exercised for real
 * against `trajectonomics/skills` before a pull request that touches `skills/`.
 *
 * It stands in for `skills@1.9.0`: `--list` prints the published set, and an install copies the
 * Skill's `SKILL.md` into the two agent trees and records the [Skill Pin](../GLOSSARY.md) the CLI would
 * record, hash
 * included. The `STUB_*` variables are fixtures, not behaviour: each makes the CLI leave behind one
 * kind of wrong state for the check to catch.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { skillFolderHash } from "./skill-folder-hash"

/** The stub's `--list` output for the Skills it reports publishing. */
export function stubList(published: readonly string[]): string {
	const noun = published.length === 1 ? "skill" : "skills"
	return [`Found ${published.length} ${noun}`, ...published.map((name) => `    ${name}`), ""].join(
		"\n",
	)
}

/** The list of Skills the source publishes, which is what `--list` prints. */
function publish(): void {
	const list = readFileSync(required("STUB_LIST"), "utf8")
	process.stdout.write(`${list}`)
}

/** One install: the Skill's files in both agent trees, and its `skills-lock.json` entry. */
function install(args: readonly string[]): void {
	const at = args.indexOf("--skill")
	const skill = args[at + 1]
	if (at < 0 || skill === undefined) throw new Error(`stub npx: no --skill: ${args.join(" ")}`)
	for (const tree of [".agents/skills", ".claude/skills"]) copySkill(tree, skill)
	if (process.env["STUB_AGENT_DIR"]) copySkill("agent/skills", skill)
	const source = valueAfter(args, "add")
	const skills = { ...readLock().skills, [skill]: entry(source, skill) }
	const extra = process.env["STUB_EXTRA_SKILL"]
	writeFileSync("skills-lock.json", `${JSON.stringify({ version: 2, skills }, null, 2)}\n`)
	if (extra !== undefined) installOutside(extra, source)
	process.stdout.write(`installed ${skill}\n`)
}

/** The Skill's `SKILL.md` into `tree`, as the CLI writes it into each agent's skills directory. */
function copySkill(tree: string, skill: string): void {
	const from = join(required("STUB_SKILLS"), skill, "SKILL.md")
	mkdirSync(join(tree, skill), { recursive: true })
	if (existsSync(from)) writeFileSync(join(tree, skill, "SKILL.md"), readFileSync(from))
}

/** A Skill installed beside the published set from the same source, which the manifest omits. */
function installOutside(skill: string, source: string): void {
	const lock = readLock()
	mkdirSync(join(".agents/skills", skill), { recursive: true })
	const skills = { ...lock.skills, [skill]: entry(source, skill) }
	writeFileSync("skills-lock.json", `${JSON.stringify({ version: 2, skills }, null, 2)}\n`)
}

/** One [Skill Pin](../GLOSSARY.md): the source and commit the install names, and the hash it left. */
function entry(source: string, skill: string): Record<string, unknown> {
	const sha = commitOf(source)
	return {
		source: source.split("@")[0] ?? source,
		...(sha === null ? {} : { ref: sha, commit: sha }),
		sourceType: sha === null ? "local" : "github",
		skillPath: `skills/${skill}/SKILL.md`,
		computedHash: skillFolderHash(join(".agents/skills", skill)),
		...overrides()[skill],
	}
}

/** The lock so far, or the empty one the CLI starts from. */
function readLock(): { skills: Record<string, Record<string, unknown>> } {
	if (!existsSync("skills-lock.json")) return { skills: {} }
	const parsed: { skills?: Record<string, Record<string, unknown>> } = JSON.parse(
		readFileSync("skills-lock.json", "utf8"),
	)
	return { skills: parsed.skills ?? {} }
}

/** The argument after `flag`, which is the source or the Skill a call names. */
function valueAfter(args: readonly string[], flag: string): string {
	const value = args[args.indexOf(flag) + 1]
	if (args.indexOf(flag) < 0 || value === undefined) throw new Error(`stub npx: no ${flag}`)
	return value
}

/** The 40-character commit a `<source>@<sha>` install names, or null for a local path. */
function commitOf(source: string): string | null {
	const ref = source.split("@")[1]
	return ref !== undefined && /^[0-9a-f]{40}$/.test(ref) ? ref : null
}

/** Per-Skill lock fields a fixture replaces, written the way the CLI would have written them. */
function overrides(): Record<string, Record<string, unknown>> {
	const raw = process.env["STUB_LOCK_OVERRIDES"]
	return raw === undefined ? {} : JSON.parse(raw)
}

/** The value `STUB_*` names, refusing a run that forgot to provide it. */
function required(name: string): string {
	const value = process.env[name]
	if (value === undefined) throw new Error(`stub npx: no ${name}`)
	return value
}

/** Stands in for one `npx` call: log it, then list or install. */
export function stubMain(): void {
	const args = process.argv.slice(2)
	writeFileSync(required("STUB_LOG"), `${args.join(" ")}\n`, { flag: "a" })
	if (args.includes("--list")) {
		publish()
		return
	}
	install(args)
}

if (import.meta.main) stubMain()
