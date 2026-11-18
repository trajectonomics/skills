import { describe, expect, it } from "bun:test"
import { readdirSync } from "node:fs"
import { join } from "node:path"
import {
	CLI_VERSION_FLOOR,
	CLI_VERSION_FLOOR_PREFIX,
	statedCliVersionFloor,
} from "./cli-version-floor"
import {
	INSTALL_CHECK,
	OPERATING_SKILL_PATH,
	PINNED_COMMIT,
	PUBLISHED_SKILLS,
	read,
	repoRoot,
	runInstallCheck,
	SKILL_PATH,
	SKILL_VERSION,
	withoutFloorLine,
} from "./skills-test-support"

/** The pin the source is installed from: one 40-character commit, never a branch or a tag. */
const PINNED = new RegExp(`add \\S+@${PINNED_COMMIT} --skill`)
/** `skills@1.9.0` records the source commit; 1.7.6 did not. */
const SKILLS_CLI = "skills@1.9.0"
/** `engines.node` of the skills CLI this repository pins; the README states it for visitors. */
const SKILLS_CLI_NODE_FLOOR = "22.20"

/** A run that left no scratch directory behind: the check cleans up what it makes. */
function leftovers(cacheLeftovers: readonly string[]): string[] {
	return cacheLeftovers.filter((entry) => entry.startsWith("skills-install."))
}

describe("the install check", () => {
	it("lists, then installs every manifest Skill by explicit --skill from one commit", () => {
		const { exitCode, output, calls, cacheLeftovers } = runInstallCheck({ source: "repo" })
		expect(output).toContain("PASS:")
		expect(exitCode).toBe(0)
		expect(calls).toHaveLength(PUBLISHED_SKILLS.length + 1)
		expect(calls[0]).toMatch(new RegExp(`^\\S+ ${SKILLS_CLI} add \\S+@${PINNED_COMMIT} --list$`))
		expect(calls.slice(1).every((call) => PINNED.test(call))).toBe(true)
		expect(calls[1]).toMatch(/--skill traj-onboarding -a claude-code codex -y$/)
		expect(calls[2]).toMatch(/--skill traj -a claude-code codex -y$/)
		expect(leftovers(cacheLeftovers)).toEqual([])
	})

	it("reads the manifest at the commit it installs, not from this checkout", () => {
		const { ghCalls } = runInstallCheck({ source: "repo" })
		expect(ghCalls[0]).toMatch(new RegExp(`repos/trajectonomics/skills/commits/${PINNED_COMMIT}`))
		expect(ghCalls[1]).toContain(
			`repos/trajectonomics/skills/contents/skills.manifest.json?ref=${PINNED_COMMIT}`,
		)
	})

	it("prints the commit it installed", () => {
		expect(runInstallCheck({ source: "repo" }).output).toContain(`Commit:   ${PINNED_COMMIT}`)
	})

	it("refuses a source that names no commit, a short one, a branch or a tag", () => {
		for (const argument of [
			"trajectonomics/skills",
			"trajectonomics/skills@8f55956",
			"trajectonomics/skills@main",
			"trajectonomics/skills@v0.2.0",
		]) {
			const { exitCode, output, calls } = runInstallCheck({ argument })
			expect(exitCode).not.toBe(0)
			expect(output).toMatch(/name the commit to install|a commit is 40 lowercase hex characters/)
			expect(calls).toEqual([])
		}
	})

	it("fails when the source publishes another Skill set", () => {
		const narrowed = runInstallCheck({ publishedSkills: ["traj-onboarding"] })
		expect(narrowed.exitCode).not.toBe(0)
		expect(narrowed.output).toContain("the source publishes '1' Skills, the manifest lists 2")

		const widened = runInstallCheck({ publishedSkills: [...PUBLISHED_SKILLS, "human-go"] })
		expect(widened.exitCode).not.toBe(0)
		expect(widened.output).toContain("the source publishes '3' Skills, the manifest lists 2")
	})

	it("matches a published name exactly, so traj-onboarding does not stand in for traj", () => {
		const { exitCode, output } = runInstallCheck({
			publishedSkills: ["traj-onboarding", "something-else"],
		})
		expect(exitCode).not.toBe(0)
		expect(output).toContain("the source does not publish traj")
	})

	it("fails a lock that records another source, on any Skill and not only the operating one", () => {
		const { exitCode, output } = runInstallCheck({
			source: "repo",
			lockOverrides: { "traj-onboarding": { source: "someone/else" } },
		})
		expect(exitCode).not.toBe(0)
		expect(output).toContain(
			'"traj-onboarding" records the source "someone/else", not "trajectonomics/skills"',
		)
	})

	it("fails a lock entry whose commit is not the one installed", () => {
		const { exitCode, output } = runInstallCheck({
			source: "repo",
			lockOverrides: { traj: { commit: "0".repeat(40) } },
		})
		expect(exitCode).not.toBe(0)
		expect(output).toContain(`"traj" records commit "${"0".repeat(40)}"`)
	})

	it("fails a lock entry whose hash the installed files do not produce", () => {
		const { exitCode, output } = runInstallCheck({
			source: "repo",
			lockOverrides: { traj: { computedHash: "b".repeat(64) } },
		})
		expect(exitCode).not.toBe(0)
		expect(output).toContain(`"traj" records the hash "${"b".repeat(64)}"`)
		expect(output).toContain("but the installed files hash to")
	})

	it("fails a Skill installed beside the published set that the manifest omits", () => {
		const { exitCode, output } = runInstallCheck({ source: "repo", extraSkill: "traj-invented" })
		expect(exitCode).not.toBe(0)
		expect(output).toContain("traj-invented")
		expect(output).toMatch(/expected exactly 'traj-onboarding/)
	})

	it("fails a second skills tree, in an `agent/` directory, beside the two the CLI writes", () => {
		const { exitCode, output } = runInstallCheck({ source: "repo", agentDir: true })
		expect(exitCode).not.toBe(0)
		expect(output).toContain("agent/ skills tree")
	})

	it("fails when the installed SKILL.md loses the release version the Site announces", () => {
		const skill = read(SKILL_PATH).replace(`  version: "${SKILL_VERSION}"\n`, "")
		expect(skill).not.toBe(read(SKILL_PATH))
		const { exitCode, output } = runInstallCheck({ skill })
		expect(exitCode).not.toBe(0)
		expect(output).toContain("metadata.version")
		expect(output).toContain(`expected ${SKILL_VERSION}`)
	})

	it("fails when the installed onboarding copy drops or restates the floor sentence", () => {
		const dropped = runInstallCheck({ skill: withoutFloorLine(read(SKILL_PATH)) })
		expect(dropped.exitCode).not.toBe(0)
		expect(dropped.output).toContain("CLI version floor ''")
		expect(dropped.output).toContain(`expected ${CLI_VERSION_FLOOR}`)

		const restated = runInstallCheck({
			skill: read(SKILL_PATH).replace(
				`${CLI_VERSION_FLOOR_PREFIX}\`${CLI_VERSION_FLOOR}\``,
				`${CLI_VERSION_FLOOR_PREFIX}\`0.3.0\``,
			),
		})
		expect(restated.exitCode).not.toBe(0)
		expect(restated.output).toContain("CLI version floor '0.3.0'")
	})

	it("fails when the operating Skill installed without a SKILL.md", () => {
		const { exitCode, output } = runInstallCheck({ operatingSkill: null })
		expect(exitCode).not.toBe(0)
		expect(output).toContain("traj/SKILL.md was not installed")
	})

	it("fails when the installed operating Skill is named something else", () => {
		const operatingSkill = read(OPERATING_SKILL_PATH).replace("name: traj", "name: not-traj")
		const { exitCode, output } = runInstallCheck({ operatingSkill })
		expect(exitCode).not.toBe(0)
		expect(output).toContain("is named 'not-traj'")
		expect(output).toContain("expected traj")
	})

	it("fails when the installed operating Skill drops the contract it publishes", () => {
		const operatingSkill = read(OPERATING_SKILL_PATH).replaceAll("traj schema --json", "traj")
		const { exitCode, output } = runInstallCheck({ operatingSkill })
		expect(exitCode).not.toBe(0)
		expect(output).toContain("does not contain 'traj schema --json'")
	})
})

describe("the install check's own pins", () => {
	it("states the Skill's version once, in the check that the install keeps it", () => {
		expect(read(INSTALL_CHECK)).toContain(`SKILL_VERSION="${SKILL_VERSION}"`)
	})

	it("reads the CLI Version Floor from the manifest, never restating the number", () => {
		const check = read(INSTALL_CHECK)
		expect(check).toContain("--floor")
		expect(check).not.toContain(`CLI_VERSION_FLOOR="${CLI_VERSION_FLOOR}"`)
		expect(statedCliVersionFloor(read(SKILL_PATH))).toBe(CLI_VERSION_FLOOR)
	})

	it("pins skills@1.9.0, the release that records the source commit", () => {
		expect(read(INSTALL_CHECK)).toContain(`SKILLS_CLI="${SKILLS_CLI}"`)
		expect(read("README.md")).toContain(SKILLS_CLI)
		expect(read("README.md")).toContain(SKILLS_CLI_NODE_FLOOR)
	})

	it("bounds each download and keeps its scratch out of a shared tmpfs", () => {
		const script = read(INSTALL_CHECK)
		expect(script).toMatch(/command -v timeout/)
		expect(script).toMatch(/command -v gtimeout/)
		expect(script).not.toContain("/tmp")
		const pkg: { scripts: Record<string, string> } = JSON.parse(read("package.json"))
		expect(pkg.scripts["check"] ?? "").not.toContain("check-skills-install")
	})

	it("publishes exactly the directories under skills/", () => {
		expect(readdirSync(join(repoRoot, "skills")).sort()).toEqual([...PUBLISHED_SKILLS].sort())
	})
})
