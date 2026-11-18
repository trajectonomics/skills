import { describe, expect, it } from "bun:test"
import { skillFrontmatter } from "./skill-frontmatter"
import { ONBOARDING_SKILL_PATH, read, section } from "./skills-test-support"

/**
 * The onboarding the council's release 1 asks for: the two gates before the first download, a set
 * installed from the pinned commit, and the four facts a person is owed before the handover.
 */
const body = skillFrontmatter(read(ONBOARDING_SKILL_PATH), ONBOARDING_SKILL_PATH).body

describe("the gates before the first download", () => {
	const gates = section(body, "Before anything downloads")

	it("says THB only and the download size before anything runs", () => {
		expect(gates).toContain("THB only")
		expect(gates).toContain("about 100 MB")
		const at = body.indexOf("## Before anything downloads")
		expect(at).toBeGreaterThan(-1)
		expect(at).toBeLessThan(body.indexOf("`traj --version`, then"))
		expect(at).toBeLessThan(body.indexOf("## Step 1: Install the command line"))
	})

	it("stops a person whose money is not THB instead of downloading anything", () => {
		expect(gates).toContain("`traj` cannot hold it yet")
		expect(gates).toContain("start no download")
		expect(gates).toContain("nothing is installed, nothing is fetched")
	})
})

describe("Step 2, installing the published set", () => {
	const stepTwo = section(body, "Step 2: Install the skill that operates `traj`")

	it("pins the commit the lock records for this skill, and never installs from main", () => {
		expect(stepTwo).toContain("records, in `skills-lock.json`, the `commit`")
		expect(stepTwo).toContain("Never install from `main`")
		expect(stepTwo).toContain("a branch moves")
	})

	it("reads the manifest at that commit and installs one explicit --skill per row", () => {
		expect(stepTwo).toContain("Fetch `skills.manifest.json` from `trajectonomics/skills` at the")
		expect(stepTwo).toContain("in install order")
		expect(stepTwo).toContain("with an explicit `--skill` per")
	})

	it("skips a row the command line cannot satisfy, naming it, its range and the reason", () => {
		expect(stepTwo).toContain("Skip a row whose CLI Range the command line does not satisfy")
		expect(stepTwo).toContain("name it with the range it wants and")
		expect(stepTwo).toContain("describe a command that")
	})

	it("falls back to traj alone, in plain words, when the manifest cannot be read", () => {
		expect(stepTwo).toContain("install `traj` alone from the pin")
		expect(stepTwo).toContain("the rest of the set could not be read")
		expect(stepTwo).toContain("nobody is left without the contract")
	})
})

describe("what the person is told about their own numbers", () => {
	const stepThree = section(body, "Step 3: Ask once, then hand over")

	it("enters a debt as a negative opening balance until the CLI normalises the sign", () => {
		expect(stepThree).toContain("Enter a debt as a negative opening balance")
		expect(stepThree).toContain("does not yet normalise the sign")
		expect(stepThree).toContain("trajectonomics/cli#149")
		expect(stepThree).toContain("reads as a gain")
	})

	it("marks a number the person guessed as rough, and never one traj computed", () => {
		expect(stepThree).toContain("A number they guessed is theirs, and you mark it rough")
		expect(stepThree).toContain("rough — your estimate")
		expect(stepThree).toContain("A figure `traj` computed is never marked")
	})
})

describe("what setup leaves behind", () => {
	const leaves = section(body, "What setup leaves behind")

	it("states the two verified facts about the network, and nothing broader", () => {
		expect(leaves).toContain("makes no network connection")
		expect(leaves).toContain("the binary download, and the `skills` CLI")
		expect(body).not.toContain("nothing leaves your machine")
	})

	it("warns never to rm -rf the directory that holds the ledger, once, with the reason", () => {
		expect(leaves).toContain("Never `rm -rf ~/.traj`")
		expect(leaves).toContain("destroys every row")
		expect(body.split("rm -rf ~/.traj")).toHaveLength(2)
	})

	it("names the guarded remove as the CLI's, not this Skill's, once it exists", () => {
		expect(leaves).toContain("trajectonomics/cli#148")
		expect(leaves).toContain("guarded")
	})
})
