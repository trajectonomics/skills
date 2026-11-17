/**
 * A first-party Skill's frontmatter: its top-level fields, the block as written (which carries nested
 * metadata) and the body, which is what a visitor's agent actually reads.
 */
export function skillFrontmatter(
	source: string,
	path: string,
): { fields: Map<string, string>; block: string; body: string } {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source)
	if (!match) throw new Error(`${path} must open with a --- frontmatter block`)
	const fields = new Map<string, string>()
	for (const line of (match[1] ?? "").split(/\r?\n/)) {
		const field = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line)
		if (field?.[1] !== undefined) fields.set(field[1], (field[2] ?? "").trim())
	}
	return { fields, block: match[1] ?? "", body: source.slice(match[0].length) }
}
