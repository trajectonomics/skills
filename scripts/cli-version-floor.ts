/**
 * The one line a Skill states its [CLI Version Floor](../GLOSSARY.md) on, and the reader for it. The
 * number itself is derived in `scripts/manifest-floor.ts` from the [Skill Manifest](../GLOSSARY.md).
 */

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
