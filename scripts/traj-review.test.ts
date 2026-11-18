import { describe, expect, it } from "bun:test"
import { skillFrontmatter } from "./skill-frontmatter"
import { codeSpans, manifest, REVIEW_SKILL_PATH, read, section } from "./skills-test-support"

/**
 * Static checks on the weekly and monthly check-in Recipe (council release 3, QA tasks 10-13). The
 * command surface is checked by `skill-command-surface.test.ts` at the CLI Range floor.
 */
const source = read(REVIEW_SKILL_PATH)
const { fields, body } = skillFrontmatter(source, REVIEW_SKILL_PATH)
const row = manifest.skills.find((candidate) => candidate.name === "traj-review")

describe("the traj-review Skill", () => {
	it("is named traj-review and fires on a weekly or monthly check-in", () => {
		expect(fields.get("name")).toBe("traj-review")
		const description = fields.get("description") ?? ""
		expect(description.length).toBeGreaterThan(0)
		expect(description.length).toBeLessThanOrEqual(1024)
		const lower = description.toLowerCase()
		for (const trigger of ["weekly", "monthly", "review"]) expect(lower).toContain(trigger)
	})

	it("is published from its own manifest row, with the range the recipe needs", () => {
		expect(row).toBeDefined()
		expect(row?.cliRange).toBe(">=0.2.0 <0.3.0")
	})

	it("takes the as-of and the period from the person, and never the clock", () => {
		const step = section(body, "The as-of and the period are the person's")
		expect(step).toContain("the **as-of**, the date the review is read at")
		expect(step).toContain("a week is the seven days ending on the as-of")
		expect(step).toContain("Never read the clock, not even to fill the as-of")
		expect(step).toContain("never widen the period")
	})

	it("reads the trial balance first, and stops when it disagrees", () => {
		const step = section(body, "Step 1: the trial balance first")
		expect(codeSpans(step)).toContain("traj balance --as-of <as-of> --trial-balance --json")
		expect(step).toContain("before any other figure")
		expect(step).toContain("stop")
		expect(step).toContain("compute nothing else")
	})

	it("takes the previous period as the same length immediately before, or says no prior period", () => {
		const step = section(body, "Step 2: work out whether there is a prior period")
		expect(step).toContain("the same length immediately before the current one")
		expect(codeSpans(step)).toContain("traj tx list --json")
		expect(step).toContain("no prior period")
		expect(step).toContain("never compares against days the ledger does not hold")
	})

	it("gives every figure its as-of, its period and the entries behind it", () => {
		const step = section(body, "Step 3: the figures, each with its as-of and the entries behind it")
		expect(codeSpans(step)).toContain("traj report pnl --since <start> --until <end> --json")
		expect(codeSpans(step)).toContain("traj tx list --since <start> --until <end> --json")
		expect(step).toContain("the transaction ids")
		expect(step).toContain("never re-add its rows")
		expect(step).toContain("never flip a sign")
	})

	it("shows refunds apart from gross spend, never netted silently", () => {
		const step = section(body, "Step 4: refunds apart from gross spend")
		expect(step).toContain("A refund is income returned to an expense account")
		expect(step).toContain("the opposite sign")
		expect(step).toContain("never net a refund into the spending silently")
	})

	it("states exactly one unusual rule, prints it, and applies it with its floor and baseline", () => {
		const step = section(body, "Step 5: unusual is one fixed rule, printed with the review")
		expect(step).toContain("exceeds 1.5 times the median of its up to three")
		expect(step).toContain("previous periods **and** exceeds 1,000 THB")
		expect(step).toContain("at least two prior periods")
		expect(step).toContain("no baseline yet")
		expect(step).toContain("both conditions must hold")
		expect(step).toContain("Never call anything else unusual")
	})

	it("answers in the fixed order that starts with the trial balance and ends with the rule", () => {
		const step = section(body, "Step 6: what the review answers")
		expect(step).toContain("the as-of, the period and whether it has a prior period")
		expect(step).toContain("the trial balance's state")
		expect(step).toContain("printed once")
	})

	it("states its assumptions when nobody is there to answer", () => {
		const step = section(body, "Unattended")
		expect(step).toContain("State the assumptions in the review instead of asking")
		expect(step).toContain("An as-of the request does not carry is a stop, not a substitution")
	})

	it("reads and never writes, and says so", () => {
		const step = section(body, "What this Recipe never does")
		expect(step).toContain("It never reads the clock")
		expect(step).toContain("It never writes to the ledger")
	})
})
