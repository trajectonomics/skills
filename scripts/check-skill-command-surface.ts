/**
 * Every published Skill against the command surface the CLI publishes at that Skill's CLI Range
 * floor. The offline half runs on a checked-in fixture inside `bun run check`; the online half is a CI
 * step that regenerates the fixture from the release, so a Skill cannot pass by naming a command that
 * only exists on `main`.
 *
 *   bun scripts/check-skill-command-surface.ts scripts/fixtures/cli-schema-0.2.0.json
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { cliFloor } from "./cli-range"
import type { PublishedSchema } from "./cli-schema"
import { repoRoot } from "./repo"
import { commandSurfaceFindings } from "./skill-command-surface"
import { MANIFEST_PATH, parseSkillManifest } from "./skills-manifest"

const fixtures = process.argv.slice(2)
if (fixtures.length === 0) {
	throw new Error("usage: bun scripts/check-skill-command-surface.ts <fixture.json>...")
}
const schemas = fixtures.map((path) => JSON.parse(readFileSync(path, "utf8")) as PublishedSchema)
const manifest = parseSkillManifest(readFileSync(join(repoRoot, MANIFEST_PATH), "utf8"))
const findings = manifest.skills.flatMap((row) => {
	const schema = schemas.find((candidate) => candidate.version === cliFloor(row.cliRange))
	if (schema === undefined) {
		return [{ skill: row.name, span: row.cliRange, problem: "has no fixture for its floor" }]
	}
	const source = readFileSync(join(repoRoot, row.path, "SKILL.md"), "utf8")
	return commandSurfaceFindings(row.name, source, schema)
})

if (findings.length > 0) {
	for (const finding of findings) {
		console.error(`${finding.skill}: "${finding.span}" ${finding.problem}`)
	}
	process.exit(1)
}
console.log(
	`PASS: ${manifest.skills.length} Skills name only what the CLI publishes at ${schemas.map((schema) => schema.version).join(", ")}.`,
)
