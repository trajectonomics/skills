import { describe, expect, it } from "bun:test"
import { skillFrontmatter } from "./skill-frontmatter"
import { metadataCli } from "./skill-metadata"
import { manifest, OPERATING_SKILL_PATH, read } from "./skills-test-support"

/**
 * Static checks on the first-party operating Skill, `traj`, which publishes from this repository and
 * which the onboarding Skill installs. `check-skills-install.test.ts` holds the install proof, and
 * `skill-command-surface.test.ts` holds the rule that it names only what the CLI publishes.
 */
describe("the traj operating Skill", () => {
	const source = read(OPERATING_SKILL_PATH)
	const { fields, block, body } = skillFrontmatter(source, OPERATING_SKILL_PATH)

	it("is named traj and fires on someone's own money", () => {
		expect(fields.get("name")).toBe("traj")
		const description = fields.get("description") ?? ""
		expect(description.length).toBeGreaterThan(0)
		expect(description.length).toBeLessThanOrEqual(1024)
		const lower = description.toLowerCase()
		for (const trigger of ["money", "net worth", "financial-independence"]) {
			expect(lower).toContain(trigger)
		}
	})

	it("is loaded by the agent itself, so a person needs no slash command", () => {
		expect(fields.has("disable-model-invocation")).toBe(false)
	})

	it("carries the manifest's CLI Range, and no version of its own to pin", () => {
		const row = manifest.skills.find((candidate) => candidate.name === "traj")
		expect(metadataCli(source)).toBe(row?.cliRange ?? "")
		expect(block).not.toMatch(/^\s+version:/m)
	})

	it("takes the command surface from the tool, never from its own prose", () => {
		for (const call of [
			"traj schema --json",
			"traj schema <command> --json",
			"traj help <command>",
		]) {
			expect(body).toContain(call)
		}
		expect(body).toContain("not from memory and not from this document")
	})

	it("never invents a command, a flag, a field or an enum value", () => {
		expect(body).toContain("**Never invent a command, a flag, a field or an enum value.**")
		expect(body).toContain("a guess that happens to run is worse than a refusal")
	})

	it("runs the scoped package, warns that the unscoped name is another package, and pins the version", () => {
		expect(body).toContain("@trajectonomics/cli@latest")
		expect(body).toContain("the unscoped package of the same short name belongs to someone else")
		expect(body).toContain("get the version once and pin it")
		expect(body).toContain("one session cannot end up running two releases")
	})

	it("keeps the person's data on their own machine", () => {
		expect(body).toContain("~/.traj")
		expect(body).toContain("TRAJ_HOME")
		expect(body).toContain("never uploading or pasting")
	})

	it("asks the command line for JSON on every call, never inferring a format", () => {
		expect(body).toContain("Pass `--json` on every call")
		expect(body).toContain("never inferred from a terminal")
	})

	it("reads the error envelope and the exit classes, and stops on a launcher failure", () => {
		expect(body).toContain("A JSON error is an envelope on stderr")
		for (const exitClass of ["`0` ok", "`2` invalid input", "`3` the domain refused it"])
			expect(body).toContain(exitClass)
		expect(body).toContain("is plain text rather than an envelope")
	})

	it("states the money unit once per place, so no place invites a hundredfold error", () => {
		expect(body).toContain(
			'Money is a decimal string at the currency\'s scale, with its currency (`"120.50"`), ' +
				"everywhere except inside a Scenario document: an amount you pass in a flag, a CSV " +
				"`amount` cell, a transaction document, and every amount a ledger, report or projection " +
				"result prints.",
		)
		expect(body).toContain(
			"Inside a Scenario document — one you apply or read back, and the `--set` overrides that " +
				"change it — money is an integer of minor units, so `100000` is 1,000.00 THB, which is " +
				"that document's form of the same amount and not a restatement.",
		)
		expect(body).toContain("`traj schema` is the authority wherever it states a unit.")
		expect(body).toContain(
			"Keep the unit the user's: restating one amount in a different unit is a second number " +
				"you invented.",
		)
	})

	it("retires both phrases that invited a hundredfold error", () => {
		expect(body).not.toContain("decimal string on the wire")
		expect(body).not.toContain("keep both ends integer")
	})

	it("keeps dates Gregorian YYYY-MM-DD, converting a Buddhist Era year", () => {
		expect(body).toContain("Dates are `YYYY-MM-DD` Gregorian")
		expect(body).toContain("A Buddhist Era year is the same day under a different year number")
	})

	it("takes every fact from the person, including every as-of, and never the clock", () => {
		expect(body).toContain("`traj` has no clock and no opinions")
		expect(body).toContain("including every as-of date")
		expect(body).toContain("it is never read off the machine")
		expect(body).toContain("is a question, not a guess")
	})

	it("dry-runs first and sets an external reference, wherever the schema lists them", () => {
		expect(body).toContain("**Dry run first.**")
		expect(body).toContain("**Set an external reference on every write.**")
		expect(body).toContain("wherever the schema lists them")
	})

	it("uses traj rather than a direct import, and says so", () => {
		expect(body).toContain("Use `traj`; never import a core package")
	})

	it("says what this version cannot do instead of approximating it", () => {
		expect(body).toContain("read it before you promise anything")
		expect(body).toContain("leave the missing number missing rather than approximating it")
		expect(body).toContain("never present an estimate as the tool's answer")
		expect(body).toContain("states the as-of date it was read at, and whether tax is in it")
	})

	it("hands a job to the Skill that owns it, installed by its explicit name", () => {
		expect(body).toContain("npx skills add trajectonomics/skills --skill <name> -y")
		expect(body).toContain("is not a router either")
	})

	it("carries no recipe of its own: the tax flags, the labels, the Scenario shape and the projection commands left it", () => {
		for (const removed of [
			"scenario tax",
			"--label",
			"--filing-status",
			"--children",
			"income.section40_1",
			"allowance.retirement",
			"contentHash",
			"Override path",
			"sim-core",
			"projection run",
			"projection compare",
			"traj fi",
		])
			expect(body).not.toContain(removed)
	})
})
