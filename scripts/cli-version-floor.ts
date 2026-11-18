/**
 * The [CLI Version Floor](../GLOSSARY.md): the lower bound of the operating Skill's CLI Range in the
 * [Skill Manifest](../GLOSSARY.md), which is where the number is authored. `scripts/check-skills-install.sh`
 * reads the same manifest, and the tests compare the number with the line the onboarding Skill states.
 */
import { readFileSync } from "node:fs"
import { cliVersionFloor } from "./cli-range"
import { MANIFEST_PATH, parseSkillManifest } from "./skills-manifest"

/** The oldest `@trajectonomics/cli` release whose command surface a published Skill assumes. */
export const CLI_VERSION_FLOOR = cliVersionFloor(
	parseSkillManifest(readFileSync(new URL(`../${MANIFEST_PATH}`, import.meta.url), "utf8")).skills,
)

/** The fixed prefix of the Skill's floor line; the version follows it in backticks. */
export const CLI_VERSION_FLOOR_PREFIX = "The CLI version floor is "

/** The CLI Version Floor a Skill states in its marked line, or null when it states none. */
export function statedCliVersionFloor(skillSource: string): string | null {
	for (const line of skillSource.split(/\r?\n/)) {
		if (!line.startsWith(CLI_VERSION_FLOOR_PREFIX)) continue
		const version = /`([^`]+)`/.exec(line.slice(CLI_VERSION_FLOOR_PREFIX.length))
		return version?.[1] ?? null
	}
	return null
}
