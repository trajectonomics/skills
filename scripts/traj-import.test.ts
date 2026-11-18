import { describe, expect, it } from "bun:test"
import { skillFrontmatter } from "./skill-frontmatter"
import { codeSpans, IMPORT_SKILL_PATH, manifest, read, section } from "./skills-test-support"

/**
 * Static checks on the bank-statement import Recipe. The rules are the council's release 2 and QA
 * task 9; the command surface is checked by `skill-command-surface.test.ts` at the CLI Range floor.
 */
const source = read(IMPORT_SKILL_PATH)
const { fields, body } = skillFrontmatter(source, IMPORT_SKILL_PATH)
const row = manifest.skills.find((candidate) => candidate.name === "traj-import")

describe("the traj-import Skill", () => {
	it("is named traj-import and fires on a bank export", () => {
		expect(fields.get("name")).toBe("traj-import")
		const description = fields.get("description") ?? ""
		expect(description.length).toBeGreaterThan(0)
		expect(description.length).toBeLessThanOrEqual(1024)
		const lower = description.toLowerCase()
		for (const trigger of ["bank", "import", "statement"]) expect(lower).toContain(trigger)
	})

	it("is published from its own manifest row, with the range the recipe needs", () => {
		expect(row).toBeDefined()
		expect(row?.cliRange).toBe(">=0.2.0 <0.3.0")
	})

	it("reads the template the release prints, and never restates its columns", () => {
		expect(codeSpans(body)).toContain("traj tx import --template")
		expect(body).not.toContain("date,from,to")
		expect(section(body, "Step 1: read the bank's header")).toContain(
			"it is the bank's, not the template's",
		)
	})

	it("confirms the signed-amount mapping once, and states the one it chose when unattended", () => {
		const step = section(body, "Step 2: choose the signed-amount mapping, and confirm it once")
		expect(step).toContain("The template's amount column is a magnitude")
		expect(step).toContain("confirm that mapping once")
		expect(step).toContain("Unattended, state the mapping you chose")
	})

	it("charts every counterparty to an account that exists, or asks", () => {
		const step = section(body, "Step 3: chart every counterparty")
		expect(step).toContain("must land on an account that already exists")
		expect(step).toContain("a question, not a guess")
		expect(step).toContain("needs the person's word")
	})

	it("dates the opening balance on the statement's start date, never today", () => {
		const step = section(body, "Step 4: date the opening balance where the statement starts")
		expect(step).toContain("dated on the statement's start date")
		expect(step).toContain("never today")
		expect(step).toContain("opening equity account")
	})

	it("derives the external reference from bank-side data, indexed for twins and never a row number", () => {
		const step = section(body, "Step 5: derive the external reference from bank-side data")
		expect(step).toContain("the bank's transaction id when the export supplies one")
		expect(step).toContain("1-based occurrence index appended for twins")
		expect(step).toContain("Never use the row number, the line number or a counter of your own")
		expect(step).toContain("case-folding")
		expect(step).toContain("the signed decimal exactly as imported")
	})

	it("fixes the scheme once the ledger holds imported rows, so a change carries a migration note", () => {
		const step = section(body, "Step 5: derive the external reference from bank-side data")
		expect(step).toContain("fixed once the person's ledger holds imported rows")
		expect(step).toContain("a change to it is a migration note in this Recipe")
		expect(step).toContain("never a silent edit")
	})

	it("dry-runs and shows what it reports before importing anything", () => {
		const step = section(body, "Step 6: write the file, dry-run it, then import")
		expect(step).toContain("Run the dry run first")
		expect(step).toContain("Only then import")
		expect(codeSpans(body).filter((span) => span.startsWith("traj tx import"))).toEqual([
			"traj tx import --template",
		])
	})

	it("stops a first import that reports any duplicate row, and calls a re-import nothing to do", () => {
		const step = section(body, "Step 6: write the file, dry-run it, then import")
		expect(step).toContain("Stop when a first import reports any `duplicate` row")
		expect(step).toContain("duplicates are the scheme working")
		expect(step).toContain("report nothing to do and import nothing")
	})

	it("proves the import with the trial balance and the statement's own closing balance", () => {
		const step = section(body, "Step 7: prove it")
		expect(step).toContain("the trial balance at the statement's end date balances")
		expect(codeSpans(step)).toContain("traj balance --as-of <end> --trial-balance --json")
		expect(step).toContain("the statement's closing balance, to the satang")
	})

	it("undoes with tx void, never a delete, an edit or a second import", () => {
		const step = section(body, "Step 8: the undo is a void")
		expect(codeSpans(step)).toContain("traj tx void <id> --date <date> --json")
		expect(step).toContain("Never delete a row")
		expect(step).toContain("never edit the imported file in place")
		expect(step).toContain("never re-import to correct one")
	})

	it("reads every command from the schema rather than from its own prose", () => {
		expect(body).toContain("Every command, flag, column and document shape comes from")
		expect(body).toContain("When the schema does not publish something this Recipe needs")
	})
})
