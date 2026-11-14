import { describe, expect, it } from "bun:test"
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Static checks on the first-party onboarding Skill, a stubbed run of its install check and the
 * README the website links to. No network: the stub stands in for the skills CLI, and the real
 * networked check is `bash scripts/check-traj-onboarding-install.sh`.
 */
const repoRoot = fileURLToPath(new URL("..", import.meta.url))

const SKILL_PATH = "skills/traj-onboarding/SKILL.md"
const WEBSITE_COMMAND = "npx skills add trajectonomics/skills --skill traj-onboarding"
const OPERATING_SKILL_COMMAND = "npx skills add trajectonomics/internal-skills --skill traj"
const CLI_REPOSITORY = "https://github.com/trajectonomics/cli"
const CLI_PACKAGE = "@trajectonomics/cli"
const PRIVATE_PACKAGE = "bun add @trajectonomics/skills"
const INSTALL_CHECK = "scripts/check-traj-onboarding-install.sh"

/** `engines.node` of the skills CLI this repository pins; the README states it for visitors. */
const SKILLS_CLI_NODE_FLOOR = "22.20"
/** `engines.node` of the command line the Skill installs. */
const CLI_NODE_FLOOR = "Node 20"

/** Stands in for `npx`: it logs its arguments and writes the one Skill it is told to install. */
const STUB_NPX = [
	"#!/usr/bin/env bash",
	"set -euo pipefail",
	'printf "%s\\n" "$*" >> "$STUB_LOG"',
	'case " $* " in',
	'  *" --list "*)',
	'    echo "Found 1 skill"',
	'    echo "    traj-onboarding"',
	"    ;;",
	"  *)",
	"    for dir in .agents/skills .claude/skills; do",
	'      mkdir -p "$dir/traj-onboarding"',
	'      printf -- "---\\nname: traj-onboarding\\n---\\n" > "$dir/traj-onboarding/SKILL.md"',
	"    done",
	"    ;;",
	"esac",
	"",
].join("\n")

function read(relativePath: string): string {
	return readFileSync(join(repoRoot, relativePath), "utf8")
}

/** The Skill's frontmatter as a flat map of top-level `key: value` lines, plus its body. */
function frontmatter(source: string): { fields: Map<string, string>; body: string } {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source)
	if (!match) throw new Error(`${SKILL_PATH} must open with a --- frontmatter block`)
	const fields = new Map<string, string>()
	for (const line of (match[1] ?? "").split(/\r?\n/)) {
		const field = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line)
		if (field?.[1] !== undefined) fields.set(field[1], (field[2] ?? "").trim())
	}
	return { fields, body: source.slice(match[0].length) }
}

/** Runs the install check against a stub `npx`, returning the CLI calls it made. */
function runInstallCheck(): { exitCode: number; calls: string[]; cacheLeftovers: string[] } {
	const sandbox = mkdtempSync(join(homedir(), ".cache", "traj-onboarding-check-"))
	const binDir = join(sandbox, "bin")
	const cache = join(sandbox, "cache")
	const log = join(sandbox, "npx.log")
	mkdirSync(binDir)
	mkdirSync(cache)
	writeFileSync(join(binDir, "npx"), STUB_NPX)
	chmodSync(join(binDir, "npx"), 0o755)
	try {
		const result = Bun.spawnSync(["bash", INSTALL_CHECK, "."], {
			cwd: repoRoot,
			env: {
				...process.env,
				PATH: `${binDir}:${process.env["PATH"] ?? ""}`,
				XDG_CACHE_HOME: cache,
				STUB_LOG: log,
			},
		})
		const calls = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : []
		return { exitCode: result.exitCode ?? 1, calls, cacheLeftovers: readdirSync(cache) }
	} finally {
		rmSync(sandbox, { recursive: true, force: true })
	}
}

describe("the traj-onboarding Skill", () => {
	const { fields, body } = frontmatter(read(SKILL_PATH))

	it("is named traj-onboarding and fires on getting started with someone's money", () => {
		expect(fields.get("name")).toBe("traj-onboarding")
		const description = fields.get("description") ?? ""
		expect(description.length).toBeGreaterThan(0)
		expect(description.length).toBeLessThanOrEqual(1024)
		const lower = description.toLowerCase()
		for (const trigger of ["get started", "install", "financial situation", "goal"]) {
			expect(lower).toContain(trigger)
		}
	})

	it("is loaded by the agent itself, so a visitor needs no slash command", () => {
		expect(fields.has("disable-model-invocation")).toBe(false)
	})

	it("installs the operating Skill from internal-skills in this Skill's own scope", () => {
		expect(body).toContain(OPERATING_SKILL_COMMAND)
		expect(body).toContain("skills list --json")
		expect(body).toContain("add `-g` when the project list did not name `traj-onboarding`")
	})

	it("runs the scoped command line package and points PATH installs at the CLI repository", () => {
		expect(body).toContain(CLI_PACKAGE)
		expect(body).toContain(CLI_REPOSITORY)
		expect(body).not.toMatch(/\bnpx\s+(?:-y\s+)?traj\b/)
	})
})

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

describe("the README the website links to", () => {
	const readme = read("README.md")

	it("leads with the website command as written, without -y or an agent flag", () => {
		const commandLines = readme
			.split("\n")
			.filter((line) => line.startsWith("npx skills add trajectonomics/skills"))
		expect(commandLines).toEqual([WEBSITE_COMMAND])
		expect(readme.indexOf(WEBSITE_COMMAND)).toBeLessThan(readme.indexOf("## Development"))
	})

	it("states the Node floor of the command line separately", () => {
		expect(readme).toContain(CLI_NODE_FLOOR)
	})

	it("puts the website command before the private package", () => {
		const website = readme.indexOf(WEBSITE_COMMAND)
		const privatePackage = readme.indexOf(PRIVATE_PACKAGE)
		expect(website).toBeGreaterThan(-1)
		expect(privatePackage).toBeGreaterThan(-1)
		expect(website).toBeLessThan(privatePackage)
	})
})

describe("the published Skill set", () => {
	it("keeps traj-onboarding out of skills-lock.json, which would hide it from visitors", () => {
		const lock: { skills?: Record<string, unknown> } = JSON.parse(read("skills-lock.json"))
		expect(Object.keys(lock.skills ?? {})).not.toContain("traj-onboarding")
	})

	it.each([".agents/skills", ".claude/skills", ".vibe/skills"])(
		"keeps traj-onboarding out of %s, which holds vendored Skills only",
		(vendoredTree) => {
			expect(existsSync(join(repoRoot, vendoredTree, "traj-onboarding"))).toBe(false)
		},
	)
})
