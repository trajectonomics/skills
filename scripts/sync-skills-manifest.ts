/**
 * Writes each published Skill's `metadata.cli` from its [Skill Manifest](../GLOSSARY.md) row, so the
 * range is authored in one place. `bun run check` fails while a Skill's copy disagrees with it.
 *
 *   bun run skills:sync
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { repoRoot } from "./repo"
import { frontmatterWrites } from "./skill-metadata"
import { MANIFEST_PATH, parseSkillManifest } from "./skills-manifest"

if (import.meta.main) {
	const manifest = parseSkillManifest(readFileSync(join(repoRoot, MANIFEST_PATH), "utf8"))
	for (const write of frontmatterWrites(manifest, (path) =>
		readFileSync(join(repoRoot, path), "utf8"),
	)) {
		if (!write.changed) continue
		writeFileSync(join(repoRoot, write.path), write.source)
		console.log(`wrote metadata.cli in ${write.path}`)
	}
}
