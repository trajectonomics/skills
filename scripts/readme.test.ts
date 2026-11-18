import { describe, expect, it } from "bun:test"
import { read, WEBSITE_COMMAND } from "./skills-test-support"

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

	it("gives a person who can only paste one block to hand their agent", () => {
		const lines = readme.split("\n").filter((line) => line.startsWith("> "))
		const block = lines.join(" ")
		expect(block).toContain(`${WEBSITE_COMMAND} -y`)
		expect(block).toContain("read the `traj-onboarding` skill and follow it")
		const developmentAt = readme.indexOf("## Development")
		for (const line of lines) expect(readme.indexOf(line)).toBeLessThan(developmentAt)
	})

	it("names the no-shell limit of that block, rather than hiding it", () => {
		expect(readme).toContain("If you cannot run shell commands")
		expect(readme).toContain("give me the command above to run myself")
	})
})
