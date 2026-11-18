/**
 * The frontmatter copy of a Skill's [CLI Range](../GLOSSARY.md): written from the
 * [Skill Manifest](../GLOSSARY.md) by `scripts/sync-skills-manifest.ts` and checked by
 * `scripts/skills-manifest.test.ts`, never authored in the Skill itself.
 */
import type { SkillManifest } from "./skills-manifest"

/** The metadata key the range is copied into. */
const CLI = "cli"

/** The CLI Range a Skill's frontmatter declares, or null when it declares none. */
export function metadataCli(skillSource: string): string | null {
	const lines = frontmatterLines(skillSource)
	if (lines === null) return null
	for (const line of metadataChildren(lines)) {
		const match = /^\s+cli:\s*(.*)$/.exec(line)
		if (match) return (match[1] ?? "").replace(/^"|"$/g, "").trim() || null
	}
	return null
}

/** The Skill source with its `metadata.cli` line rewritten to `cliRange`, other fields untouched. */
export function withMetadataCli(skillSource: string, cliRange: string): string {
	const match = /^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)/.exec(skillSource)
	if (!match) throw new Error("a Skill must open with a --- frontmatter block")
	const lines = (match[2] ?? "").split(/\r?\n/).filter((line) => !/^\s+cli:/.test(line))
	const metadataAt = lines.findIndex((line) => /^metadata:\s*$/.test(line))
	if (metadataAt < 0) lines.push("metadata:")
	lines.splice(metadataAt < 0 ? lines.length : metadataAt + 1, 0, `  ${CLI}: "${cliRange}"`)
	const rest = skillSource.slice(match[0].length)
	return `${match[1]}${lines.join("\n")}${match[3]}${rest}`
}

/** The frontmatter's lines, or null when the source has no frontmatter block. */
function frontmatterLines(skillSource: string): string[] | null {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(skillSource)
	return match ? (match[1] ?? "").split(/\r?\n/) : null
}

/** The indented lines under `metadata:`, which is where the range is copied to. */
function metadataChildren(lines: readonly string[]): string[] {
	const at = lines.findIndex((line) => /^metadata:\s*$/.test(line))
	if (at < 0) return []
	const children: string[] = []
	for (const line of lines.slice(at + 1)) {
		if (!/^\s+\S/.test(line)) break
		children.push(line)
	}
	return children
}

/** The Skill sources a manifest implies, and whether each differs from what is on disk. */
export function frontmatterWrites(
	manifest: SkillManifest,
	readSkill: (path: string) => string,
): { path: string; source: string; changed: boolean }[] {
	return manifest.skills.map((row) => {
		const path = `${row.path}/SKILL.md`
		const current = readSkill(path)
		const source = withMetadataCli(current, row.cliRange)
		return { path, source, changed: source !== current }
	})
}
