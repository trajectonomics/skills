/**
 * The [CLI Version Floor](../GLOSSARY.md) the onboarding Skill declares, and the reader for the
 * one line that states it. `scripts/check-traj-onboarding-install.sh` pins the same number.
 */

/** The oldest `@trajectonomics/cli` release whose command surface the operating Skill assumes. */
export const CLI_VERSION_FLOOR = "0.2.0"

/** The fixed prefix of the Skill's floor line; the version follows it in backticks. */
export const CLI_VERSION_FLOOR_PREFIX = "The CLI version floor is "

/**
 * The CLI Version Floor a Skill states, read from the first line that carries the marked prefix; null
 * when the Skill states none or that line carries no version in backticks. The install check reads
 * the installed copy the same way.
 */
export function statedCliVersionFloor(skillSource: string): string | null {
	for (const line of skillSource.split(/\r?\n/)) {
		if (!line.startsWith(CLI_VERSION_FLOOR_PREFIX)) continue
		const version = /`([^`]+)`/.exec(line.slice(CLI_VERSION_FLOOR_PREFIX.length))
		return version?.[1] ?? null
	}
	return null
}

/** The Skill's source with its floor line removed, the way a stale installed copy arrives. */
export function withoutCliVersionFloorLine(skillSource: string): string {
	const lines = skillSource.split(/\r?\n/)
	const kept = lines.filter((line) => !line.startsWith(CLI_VERSION_FLOOR_PREFIX))
	if (kept.length === lines.length)
		throw new Error(`no '${CLI_VERSION_FLOOR_PREFIX}' line to remove`)
	return kept.join("\n")
}
