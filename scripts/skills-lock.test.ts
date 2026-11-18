import { afterAll, describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { skillFolderHash } from "./skill-folder-hash"
import { lockProblems, parseSkillsLock, type SkillsLock } from "./skills-lock"

const COMMIT = "8f5595665a5bcb4058b798e08abb8800b9d3c461"
const HASH = "a".repeat(64)

/** The lock a correct install of the published set leaves, with one entry overridable per rule. */
function lockWith(entries: Record<string, Record<string, unknown>> = {}): SkillsLock {
	const skills: Record<string, Record<string, unknown>> = {}
	for (const name of ["traj-onboarding", "traj"]) {
		skills[name] = {
			source: "trajectonomics/skills",
			ref: COMMIT,
			commit: COMMIT,
			computedHash: HASH,
			...entries[name],
		}
	}
	return { version: 2, skills }
}

const EXPECTED = {
	names: ["traj-onboarding", "traj"],
	source: "trajectonomics/skills",
	commit: COMMIT,
	hashFor: () => HASH,
}

describe("a skills lock", () => {
	it("passes when every published Skill is recorded from the pinned commit with its own hash", () => {
		expect(lockProblems(lockWith(), EXPECTED)).toEqual([])
	})

	it("fails a Skill the install never recorded", () => {
		const lock = lockWith()
		delete lock.skills?.["traj"]
		expect(lockProblems(lock, EXPECTED)).toEqual([
			'"traj" is not in skills-lock.json, so nothing recorded it',
		])
	})

	it("fails an entry from another source, on any Skill, not only the operating one", () => {
		expect(lockProblems(lockWith({ traj: { source: "someone/else" } }), EXPECTED)).toEqual([
			'"traj" records the source "someone/else", not "trajectonomics/skills"',
		])
	})

	it("fails an entry whose commit is not the one installed", () => {
		expect(lockProblems(lockWith({ traj: { commit: "0".repeat(40) } }), EXPECTED)).toEqual([
			`"traj" records commit "${"0".repeat(40)}", not "${COMMIT}"`,
		])
	})

	it("fails an entry whose hash disagrees with the files the install left", () => {
		expect(lockProblems(lockWith({ traj: { computedHash: "b".repeat(64) } }), EXPECTED)).toEqual([
			`"traj" records the hash "${"b".repeat(64)}", but the installed files hash to "${HASH}"`,
		])
	})

	it("fails an installed Skill the manifest does not publish", () => {
		const lock = lockWith()
		lock.skills = { ...lock.skills, "traj-invented": { source: "trajectonomics/skills" } }
		expect(lockProblems(lock, EXPECTED)).toEqual([
			'"traj-invented" is installed but the manifest lists no such Skill',
		])
	})

	it("fails when a Skill has no installed directory at all", () => {
		const expected = { ...EXPECTED, hashFor: (name: string) => (name === "traj" ? null : HASH) }
		expect(lockProblems(lockWith(), expected)).toEqual([
			'"traj" has no installed directory to hash',
		])
	})

	it("records no commit for a local source, which the CLI does not pin", () => {
		const local = lockWith()
		for (const entry of Object.values(local.skills ?? {})) {
			entry.source = "../checkout"
			delete entry.commit
		}
		const expected = { ...EXPECTED, source: "../checkout", commit: null }
		expect(lockProblems(local, expected)).toEqual([])
	})

	it("refuses a file that is not a lock", () => {
		expect(() => parseSkillsLock("{")).toThrow("skills-lock.json is not JSON")
		expect(() => parseSkillsLock("[]")).toThrow("skills-lock.json has no skills map")
	})
})

describe("the hash of an installed Skill folder", () => {
	const sandbox = mkdtempSync(join(homedir(), ".cache", "skill-folder-hash-"))

	afterAll(() => rmSync(sandbox, { recursive: true, force: true }))

	/** A folder tree written from `files`, inside the sandbox the suite cleans up. */
	function folder(files: Record<string, string>): string {
		const root = mkdtempSync(join(sandbox, "skill-"))
		for (const [path, content] of Object.entries(files)) {
			mkdirSync(join(root, path, ".."), { recursive: true })
			writeFileSync(join(root, path), content)
		}
		return root
	}

	it("is path, NUL, byte length, NUL, content, in path order, as the CLI writes it", () => {
		// sha256("SKILL.md\0" + "2" + "\0" + "a\n"), computed outside this implementation.
		expect(skillFolderHash(folder({ "SKILL.md": "a\n" }))).toBe(
			"bcefee752f081fde2ae3e8e0659ce73b0a2872fd1727b8ef88df9aaf9b4e2084",
		)
	})

	it("changes with the content, not with the file names alone", () => {
		expect(skillFolderHash(folder({ "SKILL.md": "b\n" }))).not.toBe(
			skillFolderHash(folder({ "SKILL.md": "a\n" })),
		)
	})

	it("folds CRLF to LF, the way the CLI hashes a checked-out file", () => {
		expect(skillFolderHash(folder({ "SKILL.md": "a\r\nb\r\n" }))).toBe(
			skillFolderHash(folder({ "SKILL.md": "a\nb\n" })),
		)
	})

	it("skips the CLI's excluded names and covers nested files", () => {
		const bare = folder({ "SKILL.md": "a\n" })
		const noise = folder({ "SKILL.md": "a\n", "metadata.json": "{}\n", ".git/HEAD": "x\n" })
		expect(skillFolderHash(noise)).toBe(skillFolderHash(bare))
		expect(skillFolderHash(folder({ "SKILL.md": "a\n", "notes/one.md": "n\n" }))).not.toBe(
			skillFolderHash(bare),
		)
	})
})
