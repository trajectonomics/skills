import { describe, expect, it } from "bun:test"
import { existsSync, readFileSync } from "node:fs"

/**
 * Static checks on the first-party onboarding Skill, its install check and the README the
 * website links to. No network: the install check under scripts/ is the networked one.
 */
const repoRoot = new URL("..", import.meta.url)

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

function read(relativePath: string): string {
	return readFileSync(new URL(relativePath, repoRoot), "utf8")
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
		expect(body).toContain("add `-g` for the global list")
	})

	it("runs the scoped command line package and points PATH installs at the CLI repository", () => {
		expect(body).toContain(CLI_PACKAGE)
		expect(body).toContain(CLI_REPOSITORY)
		expect(body).not.toMatch(/\bnpx\s+(?:-y\s+)?traj\b/)
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

	it("states the Node floor of the skills CLI and of the command line separately", () => {
		expect(readme).toContain(SKILLS_CLI_NODE_FLOOR)
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

	it("keeps traj-onboarding out of the vendored agent Skill trees", () => {
		expect(existsSync(new URL(".agents/skills/traj-onboarding", repoRoot))).toBe(false)
	})

	it("ships a pinned, bounded install check that stays out of bun run check", () => {
		const script = read(INSTALL_CHECK)
		const pinned: string | undefined = /^SKILLS_CLI="(skills@\d+\.\d+\.\d+)"/m.exec(script)?.[1]
		expect(pinned).toBe("skills@1.7.6")
		expect(read("README.md")).toContain(pinned ?? "")
		expect(script).toContain("mktemp -d")
		expect(script).toContain(".cache")
		expect(script).not.toContain("/tmp")
		expect(script).toMatch(/-a "\$\{AGENTS\[@\]}"/)
		const pkg: { scripts: Record<string, string> } = JSON.parse(read("package.json"))
		expect(pkg.scripts["check"] ?? "").not.toContain("check-traj-onboarding-install")
	})
})
