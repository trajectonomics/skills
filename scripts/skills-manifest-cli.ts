/**
 * The [Skill Manifest](../GLOSSARY.md) as the shell checks read it: one `name<TAB>path<TAB>range`
 * line per row, in install order, and the derived [CLI Version Floor](../GLOSSARY.md).
 *
 *   bun scripts/skills-manifest-cli.ts <manifest> [--floor]
 */
import { readFileSync } from "node:fs"
import { cliVersionFloor } from "./cli-range"
import { parseSkillManifest } from "./skills-manifest"

const [path, mode] = process.argv.slice(2)
if (path === undefined) {
	throw new Error("usage: bun scripts/skills-manifest-cli.ts <manifest> [--floor]")
}
const manifest = parseSkillManifest(readFileSync(path, "utf8"), path)
if (mode === "--floor") console.log(cliVersionFloor(manifest.skills))
else for (const row of manifest.skills) console.log(`${row.name}\t${row.path}\t${row.cliRange}`)
