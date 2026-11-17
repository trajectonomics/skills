import { describe, expect, it } from "bun:test"
import { OPERATING_SKILL_PATH, read } from "./traj-onboarding-test-support"

/**
 * Static checks on the first-party operating Skill, `traj`, which publishes from this repository and
 * which the onboarding Skill installs. `traj-onboarding-install.test.ts` holds the install proof.
 */

/** The Skill's top-level frontmatter fields and its body, as the visitor's agent reads them. */
function frontmatter(source: string): { fields: Map<string, string>; body: string } {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source)
	if (!match) throw new Error(`${OPERATING_SKILL_PATH} must open with a --- frontmatter block`)
	const fields = new Map<string, string>()
	for (const line of (match[1] ?? "").split(/\r?\n/)) {
		const field = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line)
		if (field?.[1] !== undefined) fields.set(field[1], (field[2] ?? "").trim())
	}
	return { fields, body: source.slice(match[0].length) }
}

describe("the traj operating Skill", () => {
	const { fields, body } = frontmatter(read(OPERATING_SKILL_PATH))

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

	it("runs the scoped package and warns that the unscoped name belongs to someone else", () => {
		expect(body).toContain("@trajectonomics/cli@latest")
		expect(body).toContain("the unscoped package of the same short name belongs to someone else")
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
})
