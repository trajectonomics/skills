import { describe, expect, it } from "bun:test"
import { skillFrontmatter } from "./skill-frontmatter"
import { codeSpans, manifest, PLAN_SKILL_PATH, read, section } from "./skills-test-support"

/**
 * Static checks on the financial-independence and what-if Recipe's policy core (council release 4, QA
 * tasks 16, 17, 19 and 20). The command surface is checked at the CLI Range floor.
 */
const source = read(PLAN_SKILL_PATH)
const { fields, body } = skillFrontmatter(source, PLAN_SKILL_PATH)
const row = manifest.skills.find((candidate) => candidate.name === "traj-plan")

describe("the traj-plan Skill", () => {
	it("is named traj-plan and fires on financial-independence and what-if questions", () => {
		expect(fields.get("name")).toBe("traj-plan")
		const description = fields.get("description") ?? ""
		expect(description.length).toBeGreaterThan(0)
		expect(description.length).toBeLessThanOrEqual(1024)
		const lower = description.toLowerCase()
		for (const trigger of ["financial independence", "what-if", "projection"])
			expect(lower).toContain(trigger)
	})

	it("is published from its own manifest row, with the range the recipe needs", () => {
		expect(row).toBeDefined()
		expect(row?.cliRange).toBe(">=0.2.0 <0.3.0")
	})

	it("asks for the as-of and the horizon, and never substitutes a default for either", () => {
		const step = section(body, "Ask for the plan's facts, and never substitute one")
		expect(step).toContain("the **as-of**, the date the plan is read from")
		expect(step).toContain("the **horizon**, the date the plan runs to")
		expect(codeSpans(step)).toContain("traj scenario list --json")
		expect(step).toContain("No date is read off the machine")
		expect(step).toContain("a missing as-of or horizon is a question, not a default")
		expect(step).toContain("never stretch the horizon")
	})

	it("starts from the release's own template and iterates on the tool's errors", () => {
		const step = section(body, "Read the tool's own document, never a remembered one")
		expect(codeSpans(step)).toContain("traj scenario apply --template")
		expect(step).toContain("each names the path that is wrong")
		expect(step).toContain("declare the account the ledger already has")
	})

	it("reports the FI date with its horizon and assumptions, and the 25-times figure only as a rule of thumb", () => {
		const step = section(body, "Step 1: the financial-independence date")
		expect(codeSpans(step)).toContain(
			"traj fi --as-of <as-of> --horizon <horizon> --scenario <scenario> --json",
		)
		expect(step).toContain("the FI date with **its horizon** and the assumptions")
		expect(step).toContain("25-times-annual-spending figure **only** as a labelled rule of thumb")
		expect(step).toContain("never as the FI date")
		expect(step).toContain("do not extend the horizon silently")
	})

	it("reports unfunded contributions and a run-out date before the yearly detail", () => {
		const step = section(body, "Step 2: run the projection, and say when the plan runs out")
		expect(codeSpans(step)).toContain(
			"traj projection run --as-of <as-of> --horizon <horizon> --scenario <scenario> --json",
		)
		expect(step).toContain("any unfunded contribution")
		expect(step).toContain("any run-out date")
		expect(step).toContain("before the year-by-year detail")
	})

	it("makes the what-if the tool's own difference, and refuses a phrase the schema cannot express", () => {
		const step = section(body, "Step 3: the what-if is the tool's own difference")
		expect(codeSpans(step)).toContain(
			"traj projection compare <a> <b> --as-of <as-of> --horizon <horizon> --json",
		)
		expect(step).toContain("never arithmetic of your own")
		expect(step).toContain("refuse it plainly")
		expect(step).toContain("not presented as the plan")
		expect(step).toContain("carry no field name with you")
	})

	it("discloses the estimate, the unmodelled facts, the cannot-do list and every as-of", () => {
		const step = section(body, "What every answer discloses")
		expect(step).toContain("This is an estimate, not a filing")
		expect(step).toContain("What is not modelled")
		expect(step).toContain("cannot produce a tax figure yet")
		expect(step).toContain("THB")
		expect(step).toContain("no Monte Carlo, no return shock")
		expect(step).toContain("retire at 55")
		expect(step).toContain("The as-of every figure was read at, and whether tax is in it")
	})

	it("never fills a gap with its own arithmetic or reports a rule of thumb as the date", () => {
		const step = section(body, "Never")
		expect(step).toContain("Never fill a gap with your own arithmetic")
		expect(step).toContain("never present an estimate as the tool's answer")
		expect(step).toContain("Never report the 25-times figure as the FI date")
		expect(step).toContain("Never hide an unfunded contribution or a run-out")
	})
})
