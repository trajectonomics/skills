import { describe, expect, it } from "bun:test"
import { CLI_VERSION_FLOOR_PREFIX } from "./cli-version-floor"
import { CLI_VERSION_FLOOR } from "./manifest-floor"
import {
	manifest,
	ONBOARDING_SKILL_PATH,
	OPERATING_SKILL_PATH,
	PINNED_COMMIT,
	PUBLISHED_SKILLS,
	read,
	runInstallCheck,
	SKILL_VERSION,
	withoutFloorLine,
} from "./skills-test-support"

/** The pin the source is installed from: one 40-character commit, never a branch or a tag. */
const PINNED = new RegExp(`add \\S+@${PINNED_COMMIT} --skill`)
/** `skills@1.9.0` records the source commit; 1.7.6 did not. */
const SKILLS_CLI = "skills@1.9.0"
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

	it("compares against the manifest at that commit, not the one in this checkout", () => {
		const widened = JSON.stringify({
			formatVersion: 1,
			skills: [
				...manifest.skills,
				{ name: "traj-extra", path: "skills/traj-extra", cliRange: ">=0.2.0 <0.3.0" },
			],
		})
		const { exitCode, output } = runInstallCheck({ source: "repo", manifest: widened })
		expect(exitCode).not.toBe(0)
		expect(output).toContain("the manifest lists 3")
	})

	it("refuses a source that does not resolve the commit it was given", () => {
		const { exitCode, output } = runInstallCheck({
			source: "repo",
			resolvedCommit: "0".repeat(40),
		})
		expect(exitCode).not.toBe(0)
		expect(output).toContain("does not resolve")
		expect(output).toContain("to that commit")
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

	it("fails a Skill Pin whose commit is not the one installed", () => {
		const { exitCode, output } = runInstallCheck({
			source: "repo",
			lockOverrides: { traj: { commit: "0".repeat(40) } },
		})
		expect(exitCode).not.toBe(0)
		expect(output).toContain(`"traj" records commit "${"0".repeat(40)}"`)
	})

	it("fails a Skill Pin whose hash the installed files do not produce", () => {
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
		const skill = read(ONBOARDING_SKILL_PATH).replace(`  version: "${SKILL_VERSION}"\n`, "")
		expect(skill).not.toBe(read(ONBOARDING_SKILL_PATH))
		const { exitCode, output } = runInstallCheck({ onboardingSkill: skill })
		expect(exitCode).not.toBe(0)
		expect(output).toContain("metadata.version")
		expect(output).toContain(`expected ${SKILL_VERSION}`)
	})

	it("fails when the installed onboarding copy drops or restates the floor sentence", () => {
		const dropped = runInstallCheck({
			onboardingSkill: withoutFloorLine(read(ONBOARDING_SKILL_PATH)),
		})
		expect(dropped.exitCode).not.toBe(0)
		expect(dropped.output).toContain("CLI version floor ''")
		expect(dropped.output).toContain(`expected ${CLI_VERSION_FLOOR}`)

		const restated = runInstallCheck({
			onboardingSkill: read(ONBOARDING_SKILL_PATH).replace(
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
