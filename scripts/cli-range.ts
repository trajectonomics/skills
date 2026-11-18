/**
 * The [CLI Range](../GLOSSARY.md): the npm semver range a published Skill declares it expects of
 * `@trajectonomics/cli`. The Skill Manifest authors it once, every other place derives from it.
 */

/** The Skill whose range authors the [CLI Version Floor](../GLOSSARY.md). */
export const OPERATING_SKILL = "traj"

/** One comparator of a range: an operator and a semver version. */
const COMPARATOR = /^(>=|<=|>|<)(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/

/** The lower bound of a CLI Range, which is that Skill's [CLI Version Floor](../GLOSSARY.md). */
export function cliFloor(range: string): string {
	const comparators = range.trim().split(/\s+/).filter(Boolean)
	if (comparators.length === 0) throw new Error("a CLI Range must state a lower bound")
	for (const comparator of comparators) {
		if (!COMPARATOR.test(comparator)) {
			throw new Error(`a CLI Range takes ">=x.y.z" comparators, not "${comparator}"`)
		}
	}
	const lower = comparators.find((comparator) => comparator.startsWith(">="))
	if (lower === undefined) throw new Error(`a CLI Range must state a ">=" lower bound: "${range}"`)
	const floor = lower.slice(2)
	upperBound(comparators, floor, range)
	return floor
}

/** Throws unless every upper bound of `comparators` orders above the floor it sits beside. */
function upperBound(comparators: readonly string[], floor: string, range: string): void {
	for (const comparator of comparators) {
		if (comparator.startsWith(">=")) continue
		const version = comparator.replace(/^(<=|<|>)/, "")
		if (Bun.semver.order(version, floor) <= 0) {
			throw new Error(`a CLI Range's upper bound orders below its floor: "${range}"`)
		}
	}
}

/** The [CLI Version Floor](../GLOSSARY.md): the lower bound of the operating Skill's CLI Range. */
export function cliVersionFloor(rows: readonly { name: string; cliRange: string }[]): string {
	const operating = rows.find((row) => row.name === OPERATING_SKILL)
	if (operating === undefined) throw new Error(`the manifest has no "${OPERATING_SKILL}" row`)
	return cliFloor(operating.cliRange)
}
