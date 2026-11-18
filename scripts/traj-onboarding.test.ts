import { describe, expect, it } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { skillFrontmatter } from "./skill-frontmatter"
import { read, repoRoot, SKILL_PATH, SKILL_VERSION } from "./traj-onboarding-test-support"

/**
 * Static checks on the first-party onboarding Skill and the README the website links to. The
 * networked check that runs the install has its own file, `traj-onboarding-install.test.ts`.
 */
const WEBSITE_COMMAND = "npx skills add trajectonomics/skills --skill traj-onboarding"
const OPERATING_SKILL_COMMAND = "npx skills add trajectonomics/skills --skill traj"
const CLI_REPOSITORY = "https://github.com/trajectonomics/cli"
const CLI_PACKAGE = "@trajectonomics/cli"
const PRIVATE_PACKAGE = "bun add @trajectonomics/skills"
/** `engines.node` of the command line the Skill installs. */
const CLI_NODE_FLOOR = "Node 20"
/**
 * The Ledger File: the one path that says the ledger has been opened on this machine. `TRAJ_HOME` is
 * the command line's own override, so the Skill tests the same file the CLI would open. The `${` is
 * escaped because it is part of the path, not a placeholder in this file.
 */
const LEDGER_FILE = `\${TRAJ_HOME:-~/.traj}/traj.db`

/** The prose under one `## ` heading, line breaks flattened so a test quotes a sentence. */
function section(skillSource: string, heading: string): string {
	const start = skillSource.indexOf(`## ${heading}`)
	if (start < 0) throw new Error(`the Skill has no "${heading}" section`)
	const next = skillSource.indexOf("\n## ", start + 1)
	return skillSource.slice(start, next < 0 ? skillSource.length : next).replace(/\s+/g, " ")
}

/** Every inline code span in a Skill, which is where a command a reader may run is named. */
function codeSpans(skillSource: string): string[] {
	return [...skillSource.matchAll(/`([^`\n]+)`/g)].map((match) => match[1] ?? "")
}

describe("the traj-onboarding Skill", () => {
	const { fields, block, body } = skillFrontmatter(read(SKILL_PATH), SKILL_PATH)

	it("is named traj-onboarding and fires on getting started with someone's money", () => {
		expect(fields.get("name")).toBe("traj-onboarding")
		const description = fields.get("description") ?? ""
		expect(description.length).toBeGreaterThan(0)
		expect(description.length).toBeLessThanOrEqual(1024)
		const lower = description.toLowerCase()
		for (const trigger of ["get started", "install", "financial situation", "goal"]) {
			expect(lower).toContain(trigger)
		}
	})

	it("is loaded by the agent itself, so a visitor needs no slash command", () => {
		expect(fields.has("disable-model-invocation")).toBe(false)
	})

	it("carries the stable release version in frontmatter metadata, which the Site announces", () => {
		expect(block).toContain(`\nmetadata:\n  version: "${SKILL_VERSION}"`)
	})

	it("says it sets up a returning person too, as well as someone starting out", () => {
		const description = (fields.get("description") ?? "").toLowerCase()
		expect(description).toContain("already has a ledger")
	})

	it("installs the operating Skill from this repository in this Skill's own scope", () => {
		expect(body).toContain(OPERATING_SKILL_COMMAND)
		expect(body).toContain("skills list --json")
		expect(body).toContain("add `-g` when the project list did not name `traj-onboarding`")
		expect(body).not.toContain("internal-skills")
	})

	it("runs the scoped command line package and points PATH installs at the CLI repository", () => {
		expect(body).toContain(CLI_PACKAGE)
		expect(body).toContain(CLI_REPOSITORY)
		expect(body).not.toMatch(/\bnpx\s+(?:-y\s+)?traj\b/)
	})

	it("tests for the Ledger File, at the path the command line fixes on every platform", () => {
		const check = section(body, "Check what is already done")
		expect(check).toContain(LEDGER_FILE)
		expect(codeSpans(check).filter((span) => span.includes("TRAJ_HOME"))).toEqual([LEDGER_FILE])
	})

	it("checks the Ledger File first, before the two install checks run", () => {
		const check = section(body, "Check what is already done")
		const ledgerAt = check.indexOf(LEDGER_FILE)
		expect(ledgerAt).toBeGreaterThan(-1)
		expect(ledgerAt).toBeLessThan(check.indexOf("**Command line**"))
		expect(ledgerAt).toBeLessThan(check.indexOf("**Scope and operating skill**"))
	})

	it("names no traj command of its own, so the surface keeps coming from traj schema", () => {
		const commands = codeSpans(body).filter((span) => span.startsWith("traj "))
		expect([...new Set(commands)].sort()).toEqual(["traj --version", "traj schema"])
	})

	it("opens Step 3 from what the Ledger File check found, in five fixed lead-ins", () => {
		const stepThree = section(body, "Step 3: Ask once, then hand over")
		for (const leadIn of [
			"**A ledger file already exists.**",
			"**It holds rows.**",
			"**It holds nothing yet.**",
			"**The read failed.**",
			"**No ledger file yet.**",
		])
			expect(stepThree).toContain(leadIn)
	})

	it("asks the two questions from zero only where there is no Ledger File", () => {
		const stepThree = section(body, "Step 3: Ask once, then hand over")
		const fromZeroAt = stepThree.indexOf("**No ledger file yet.**")
		expect(fromZeroAt).toBeGreaterThan(-1)
		expect(stepThree.slice(0, fromZeroAt)).not.toContain("their financial situation")
		expect(stepThree.slice(fromZeroAt)).toContain("their financial situation, and their goal")
	})

	it("confirms what the ledger holds with one question, and asks the goal again", () => {
		const stepThree = section(body, "Step 3: Ask once, then hand over")
		expect(stepThree).toContain("does that match, and what is their goal")
	})

	it("reports a read that failed and hands over, rather than interviewing the person", () => {
		const stepThree = section(body, "Step 3: Ask once, then hand over")
		expect(stepThree).toMatch(/read failed\.\*\* Report what the command line said/)
		expect(stepThree).toContain("without an interview")
	})

	it("says another machine needs setup once, instead of that setup is never needed again", () => {
		expect(body).toContain("another machine needs setup once")
		expect(body).not.toContain("never needed again")
	})
})

describe("the README the website links to", () => {
	const readme = read("README.md")

	it("leads with the website command as written, without -y or an agent flag", () => {
		const commandLines = readme
			.split("\n")
			.filter((line) => line.startsWith("npx skills add trajectonomics/skills"))
		expect(commandLines).toEqual([WEBSITE_COMMAND])
		expect(readme.indexOf(WEBSITE_COMMAND)).toBeLessThan(readme.indexOf("## Development"))
	})

	it("states the Node floor of the command line separately", () => {
		expect(readme).toContain(CLI_NODE_FLOOR)
	})

	it("puts the website command before the private package", () => {
		const website = readme.indexOf(WEBSITE_COMMAND)
		const privatePackage = readme.indexOf(PRIVATE_PACKAGE)
		expect(website).toBeGreaterThan(-1)
		expect(privatePackage).toBeGreaterThan(-1)
		expect(website).toBeLessThan(privatePackage)
	})
})

describe("the published Skill set", () => {
	it("keeps no Skill Pin for either first-party Skill, which would hide it from visitors", () => {
		const lock: { skills?: Record<string, unknown> } = JSON.parse(read("skills-lock.json"))
		const pinned = Object.keys(lock.skills ?? {})
		for (const skill of ["traj-onboarding", "traj"]) expect(pinned).not.toContain(skill)
	})

	it.each([".agents/skills", ".claude/skills", ".vibe/skills"])(
		"keeps both first-party Skills out of %s, which holds vendored Skills only",
		(vendoredTree) => {
			for (const skill of ["traj-onboarding", "traj"])
				expect(existsSync(join(repoRoot, vendoredTree, skill))).toBe(false)
		},
	)
})
