import { describe, expect, it } from "bun:test"
import { read } from "./skills-test-support"

/** The one install command the Site prints, and the only one the README may lead with. */
export const WEBSITE_COMMAND = "npx skills add trajectonomics/skills --skill traj-onboarding"

/** `engines.node` of the command line the Skill installs. */
const CLI_NODE_FLOOR = "Node 20"

/** The private npm package this repository publishes for itself, which a visitor never installs. */
const PRIVATE_PACKAGE = "bun add @trajectonomics/skills"

/**
 * The README is the front door: a visitor's first screen is the install command and what to paste to
 * their agent, and the Skill checks keep the command true.
 */
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
