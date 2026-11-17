import { describe, expect, it } from "bun:test"
import {
	CLI_VERSION_FLOOR,
	CLI_VERSION_FLOOR_PREFIX,
	statedCliVersionFloor,
} from "./cli-version-floor"
import {
	FLOOR_LINE,
	OPERATING_SKILL_PATH,
	read,
	SKILL_PATH,
	withoutFloorLine,
} from "./traj-onboarding-test-support"

const skill = read(SKILL_PATH)
/** The sentence both rules that end setup must count. */
const DISCLOSURE_COUNTED = "a below-floor command line has been disclosed"

/** The pinned floor the Skill must state; a Skill that states another fails naming both numbers. */
function pinnedFloor(skillSource: string): string {
	const stated = statedCliVersionFloor(skillSource)
	if (stated === CLI_VERSION_FLOOR) return stated
	throw new Error(
		`the Skill states the CLI version floor '${stated}', expected ${CLI_VERSION_FLOOR} as '${CLI_VERSION_FLOOR_PREFIX}<version>'`,
	)
}

/** The prose under one `## ` heading, line breaks flattened so a test quotes a sentence. */
function section(skillSource: string, heading: string): string {
	const start = skillSource.indexOf(`## ${heading}`)
	if (start < 0) throw new Error(`the Skill has no "${heading}" section`)
	const next = skillSource.indexOf("\n## ", start + 1)
	const text = skillSource.slice(start, next < 0 ? skillSource.length : next)
	return text.replace(/\s+/g, " ")
}

describe("the CLI Version Floor the traj-onboarding Skill declares", () => {
	it("states the floor this repository pins, once", () => {
		expect(pinnedFloor(skill)).toBe(CLI_VERSION_FLOOR)
		expect(skill.split(CLI_VERSION_FLOOR)).toHaveLength(2)
	})

	it("states it in the onboarding Skill alone, never a second time in the operating Skill", () => {
		expect(read(OPERATING_SKILL_PATH)).not.toContain(CLI_VERSION_FLOOR_PREFIX)
	})

	it("reads no floor from a Skill that states none, and none from a marked line without one", () => {
		expect(statedCliVersionFloor("# traj\n\nNo floor here.\n")).toBeNull()
		expect(
			statedCliVersionFloor(`${CLI_VERSION_FLOOR_PREFIX}yet to be decided\n${FLOOR_LINE}\n`),
		).toBeNull()
	})

	it("states the comparison rule with its three traps", () => {
		const stepOne = section(skill, "Step 1: Install the command line")
		expect(stepOne).toContain("the first version that printed")
		expect(stepOne).toContain("the first `X.Y.Z` token")
		expect(stepOne).toContain("`-prerelease`")
		expect(stepOne).toContain("compare the three numbers in turn and never the strings")
		expect(stepOne).toContain("treat a pre-release as below its release")
	})

	it("compares the scoped package's version when the unscoped traj, or an unknown one, printed", () => {
		const stepOne = section(skill, "Step 1: Install the command line")
		expect(stepOne).toContain("unscoped `traj` on npm is a different, unrelated package")
		expect(stepOne).toContain("you cannot tell which package printed it")
		expect(stepOne).toContain("compare the scoped package's version instead")
	})

	it("discloses an older command line in five facts, at the handover", () => {
		const stepThree = section(skill, "Step 3: Ask once, then hand over")
		for (const fact of [
			"the version on this machine",
			"the version the operating skill expects",
			"recording, reading balances and reports, and testing a Scenario",
			"a projection, a financial-independence date and a tax figure",
			"`trajectonomics/cli#117`",
			"older, not broken",
			"nothing is installed or downloaded to fix it",
		]) {
			expect(stepThree).toContain(fact)
		}
	})

	it("promises a projection, an FI date or a tax meaning only from the floor up", () => {
		const stepThree = section(skill, "Step 3: Ask once, then hand over")
		expect(skill).not.toContain("The tool owns balances, projections and dates;")
		expect(stepThree).toContain("Below the floor, promise none of the last three.")
	})

	it("counts the disclosure in both rules that decide setup is done", () => {
		expect(section(skill, "Check what is already done")).toContain(DISCLOSURE_COUNTED)
		expect(section(skill, "Step 3: Ask once, then hand over")).toContain(DISCLOSURE_COUNTED)
	})

	it("rejects a Skill that drops the floor sentence", () => {
		expect(() => pinnedFloor(withoutFloorLine(skill))).toThrow(CLI_VERSION_FLOOR)
	})
})
