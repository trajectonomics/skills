import { describe, expect, it } from "bun:test"
import {
	CLI_VERSION_FLOOR,
	CLI_VERSION_FLOOR_PREFIX,
	statedCliVersionFloor,
} from "./cli-version-floor"
import {
	FLOOR_LINE,
	INSTALL_CHECK,
	read,
	runInstallCheck,
	SKILL_PATH,
	SKILL_VERSION,
	withoutFloorLine,
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

	it("pins the CLI version floor beside that version, at the floor the Skill states", () => {
		const check = read(INSTALL_CHECK)
		expect(check).toContain(`CLI_VERSION_FLOOR="${CLI_VERSION_FLOOR}"`)
		expect(check).toContain(`CLI_VERSION_FLOOR_PREFIX='${CLI_VERSION_FLOOR_PREFIX}'`)
		expect(statedCliVersionFloor(read(SKILL_PATH))).toBe(CLI_VERSION_FLOOR)
	})

	it("fails when the installed copy drops the floor sentence, naming both numbers", () => {
		const skill = withoutFloorLine(read(SKILL_PATH))
		const { exitCode, output } = runInstallCheck({ skill })
		expect(exitCode).not.toBe(0)
		expect(output).toContain("CLI version floor ''")
		expect(output).toContain(`expected ${CLI_VERSION_FLOOR}`)
	})

	it("fails when the installed copy states another number, naming both numbers", () => {
		const skill = read(SKILL_PATH).replace(FLOOR_LINE, `${CLI_VERSION_FLOOR_PREFIX}\`0.3.0\``)
		expect(skill).not.toBe(read(SKILL_PATH))
		const { exitCode, output } = runInstallCheck({ skill })
		expect(exitCode).not.toBe(0)
		expect(output).toContain("CLI version floor '0.3.0'")
		expect(output).toContain(`expected ${CLI_VERSION_FLOOR}`)
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
			FLOOR_LINE,
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
			FLOOR_LINE,
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
