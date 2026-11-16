/**
 * The [CLI Version Floor](../GLOSSARY.md) the onboarding Skill declares, and the reader for the
 * one line that states it. `scripts/check-traj-onboarding-install.sh` pins the same number.
 */

/** The oldest `@trajectonomics/cli` release whose command surface the operating Skill assumes. */
export const CLI_VERSION_FLOOR = "0.2.0"

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
