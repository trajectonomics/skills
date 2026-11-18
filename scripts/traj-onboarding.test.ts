import { describe, expect, it } from "bun:test"
import { skillFrontmatter } from "./skill-frontmatter"
import {
	codeSpans,
	ONBOARDING_SKILL_PATH,
	read,
	SKILL_VERSION,
	section,
	WEBSITE_COMMAND,
} from "./skills-test-support"

/**
 * Static checks on the first-party onboarding Skill the website installs. The networked check that
 * runs the install has its own file, `check-skills-install.test.ts`.
 */
const CLI_REPOSITORY = "https://github.com/trajectonomics/cli"
const CLI_PACKAGE = "@trajectonomics/cli"
/**
 * The Ledger File: the one path that says the ledger has been opened on this machine. `TRAJ_HOME` is
 * the command line's own override, so the Skill tests the same file the CLI would open. The `${` is
 * escaped because it is part of the path, not a placeholder in this file.
 */
const LEDGER_FILE = `\${TRAJ_HOME:-~/.traj}/traj.db`

describe("the traj-onboarding Skill", () => {
	const { fields, block, body } = skillFrontmatter(
		read(ONBOARDING_SKILL_PATH),
		ONBOARDING_SKILL_PATH,
	)

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
		expect(block).toMatch(/^metadata:/m)
		expect(block).toContain(`\n  version: "${SKILL_VERSION}"`)
	})

	it("says it sets up a returning person too, as well as someone starting out", () => {
		const description = (fields.get("description") ?? "").toLowerCase()
		expect(description).toContain("already has a ledger")
	})

	it("names one install command, the one the Site prints, with -y stated once", () => {
		const installLines = body
			.split("\n")
			.filter((line) => line.trim().startsWith("npx skills add trajectonomics/skills --skill"))
		expect(installLines).toEqual([WEBSITE_COMMAND])
		expect(body.split("an unattended run appends `-y`")).toHaveLength(2)
	})

	it("installs the published set from the commit the lock records, in this Skill's own scope", () => {
		const stepTwo = section(body, "Step 2: Install the skill that operates `traj`")
		expect(stepTwo).toContain("skills-lock.json")
		expect(stepTwo).toContain("Never install from `main`")
		expect(stepTwo).toContain("skills.manifest.json")
		expect(stepTwo).toContain("npx skills add trajectonomics/skills@<commit> --skill <name>")
		expect(stepTwo).toContain("add `-g` when the project list did not name `traj-onboarding`")
		expect(stepTwo).toContain("Skip a row whose CLI Range the command line does not satisfy")
		expect(stepTwo).toContain("install `traj` alone from the pin")
		expect(body).toContain("skills list --json")
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
