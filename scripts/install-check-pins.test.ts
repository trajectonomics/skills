import { describe, expect, it } from "bun:test"
import { readdirSync } from "node:fs"
import { join } from "node:path"
import { statedCliVersionFloor } from "./cli-version-floor"
import { CLI_VERSION_FLOOR } from "./manifest-floor"
import {
	INSTALL_CHECK,
	ONBOARDING_SKILL_PATH,
	PUBLISHED_SKILLS,
	read,
	repoRoot,
	SKILL_VERSION,
} from "./skills-test-support"

/**
 * `skills@1.9.0` records the source commit in `skills-lock.json`; 1.7.6 did not. Its `engines.node`
 * is what the README states for a visitor, and the Node floor does not move with the version.
 */
const SKILLS_CLI = "skills@1.9.0"
const SKILLS_CLI_NODE_FLOOR = "22.20"

describe("the install check's own pins", () => {
	it("states the Skill's version once, in the check that the install keeps it", () => {
		expect(read(INSTALL_CHECK)).toContain(`SKILL_VERSION="${SKILL_VERSION}"`)
	})

	it("reads the CLI Version Floor from the manifest, never restating the number", () => {
		const check = read(INSTALL_CHECK)
		expect(check).toContain("--floor")
		expect(check).not.toContain(`CLI_VERSION_FLOOR="${CLI_VERSION_FLOOR}"`)
		expect(statedCliVersionFloor(read(ONBOARDING_SKILL_PATH))).toBe(CLI_VERSION_FLOOR)
	})

	it("pins skills@1.9.0, the release that records the source commit", () => {
		expect(read(INSTALL_CHECK)).toContain(`SKILLS_CLI="${SKILLS_CLI}"`)
		expect(read("README.md")).toContain(SKILLS_CLI)
		expect(read("README.md")).toContain(SKILLS_CLI_NODE_FLOOR)
	})

	it("bounds each download and keeps its scratch out of a shared tmpfs", () => {
		const script = read(INSTALL_CHECK)
		expect(script).toMatch(/command -v timeout/)
		expect(script).toMatch(/command -v gtimeout/)
		expect(script).not.toContain("/tmp")
		const pkg: { scripts: Record<string, string> } = JSON.parse(read("package.json"))
		expect(pkg.scripts["check"] ?? "").not.toContain("check-skills-install")
	})

	it("publishes exactly the directories under skills/", () => {
		expect(readdirSync(join(repoRoot, "skills")).sort()).toEqual([...PUBLISHED_SKILLS].sort())
	})
})
