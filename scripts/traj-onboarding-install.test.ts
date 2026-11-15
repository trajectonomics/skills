import { describe, expect, it } from "bun:test"
import {
	INSTALL_CHECK,
	read,
	runInstallCheck,
	SKILL_PATH,
	SKILL_VERSION,
} from "./traj-onboarding-test-support"

/** `engines.node` of the skills CLI this repository pins; the README states it for visitors. */
const SKILLS_CLI_NODE_FLOOR = "22.20"

describe("the install check", () => {
	it("lists with the pinned CLI, then installs exactly this Skill for two agents", () => {
		const { exitCode, calls, cacheLeftovers } = runInstallCheck()
		expect(exitCode).toBe(0)
		expect(calls).toHaveLength(2)
		expect(calls[0]).toMatch(/^-\S+ skills@\d+\.\d+\.\d+ add \S+ --list$/)
		expect(calls[1]).toMatch(/^-\S+ skills@\d+\.\d+\.\d+ add \S+ --skill traj-onboarding/)
		expect(calls[1]).toContain("-a claude-code codex -y")
		expect(cacheLeftovers).toEqual([])
	})

	it("states the Skill's version once, in the check that the install keeps it", () => {
		expect(read(INSTALL_CHECK)).toContain(`SKILL_VERSION="${SKILL_VERSION}"`)
	})

	it("fails when the installed SKILL.md loses the release version", () => {
		const skill = read(SKILL_PATH).replace(`metadata:\n  version: "${SKILL_VERSION}"\n`, "")
		expect(skill).not.toBe(read(SKILL_PATH))
		const { exitCode, output } = runInstallCheck({ skill })
		expect(exitCode).not.toBe(0)
		expect(output).toContain("metadata.version")
		expect(output).toContain(`expected ${SKILL_VERSION}`)
	})

	it("reads the version from the metadata block, not another nested version: line", () => {
		const skill = [
			"---",
			"name: traj-onboarding",
			"other:",
			'  version: "9.9.9"',
			"metadata:",
			`  version: "${SKILL_VERSION}"`,
			"---",
			"",
		].join("\n")
		expect(runInstallCheck({ skill }).exitCode).toBe(0)
	})

	it("fails when a later top-level key carries the version, not the metadata block", () => {
		const skill = [
			"---",
			"name: traj-onboarding",
			"metadata:",
			"other:",
			`  version: "${SKILL_VERSION}"`,
			"---",
			"",
		].join("\n")
		const { exitCode, output } = runInstallCheck({ skill })
		expect(exitCode).not.toBe(0)
		expect(output).toContain("metadata.version")
	})

	it("accepts the version line with trailing spaces", () => {
		const skill = [
			"---",
			"name: traj-onboarding",
			"metadata:",
			`  version: "${SKILL_VERSION}"  `,
			"---",
			"",
		].join("\n")
		expect(runInstallCheck({ skill }).exitCode).toBe(0)
	})

	it("runs the CLI version the README states the Node floor for", () => {
		const pin =
			runInstallCheck()
				.calls.join(" ")
				.match(/skills@\d+\.\d+\.\d+/)?.[0] ?? ""
		expect(pin).not.toBe("")
		expect(read("README.md")).toContain(pin)
		expect(read("README.md")).toContain(SKILLS_CLI_NODE_FLOOR)
	})

	it("bounds each download and keeps its scratch out of /tmp", () => {
		const script = read(INSTALL_CHECK)
		expect(script).toMatch(/command -v timeout/)
		expect(script).toMatch(/command -v gtimeout/)
		expect(script).not.toContain("/tmp")
		const pkg: { scripts: Record<string, string> } = JSON.parse(read("package.json"))
		expect(pkg.scripts["check"] ?? "").not.toContain("check-traj-onboarding-install")
	})
})
