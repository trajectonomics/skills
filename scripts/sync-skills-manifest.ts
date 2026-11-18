/**
 * Writes each published Skill's `metadata.cli` from its [Skill Manifest](../GLOSSARY.md) row, so the
 * range is authored in one place. `bun run check` fails while a Skill's copy disagrees with it.
 *
 *   bun run skills:sync
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { withMetadataCli } from "./skill-metadata"
import { MANIFEST_PATH, parseSkillManifest, type SkillManifest } from "./skills-manifest"

/** The repository root, where the manifest and the Skills it names live. */
const repoRoot = fileURLToPath(new URL("..", import.meta.url))

/** The Skill sources this manifest implies, and whether they differ from what is on disk. */
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

function main(): void {
	const manifest = parseSkillManifest(readFileSync(join(repoRoot, MANIFEST_PATH), "utf8"))
	for (const write of frontmatterWrites(manifest, (path) =>
		readFileSync(join(repoRoot, path), "utf8"),
	)) {
		if (!write.changed) continue
		writeFileSync(join(repoRoot, write.path), write.source)
		console.log(`wrote metadata.cli in ${write.path}`)
	}
}

if (import.meta.main) main()
