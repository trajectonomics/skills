/**
 * The [CLI Version Floor](../GLOSSARY.md): the lower bound of the operating Skill's CLI Range in the
 * [Skill Manifest](../GLOSSARY.md), which is where the number is authored. This is the one place a
 * reader turns the manifest into the number; `scripts/check-skills-install.sh` reads it through
 * `scripts/skills-manifest-cli.ts --floor`, and the tests compare it with the line a Skill states.
 */
import { readFileSync } from "node:fs"
import { cliVersionFloor } from "./cli-range"
import { MANIFEST_PATH, parseSkillManifest } from "./skills-manifest"

/** The oldest `@trajectonomics/cli` release whose command surface a published Skill assumes. */
export const CLI_VERSION_FLOOR = cliVersionFloor(
	parseSkillManifest(readFileSync(new URL(`../${MANIFEST_PATH}`, import.meta.url), "utf8")).skills,
)
