import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { CLI_VERSION_FLOOR_PREFIX } from "./cli-version-floor"
import { CLI_VERSION_FLOOR } from "./manifest-floor"
import { repoRoot } from "./repo"
import { MANIFEST_PATH, parseSkillManifest, type SkillManifest } from "./skills-manifest"

/** The repository root, so a test reads the files a visitor receives, never a copied fixture. */
export { repoRoot }

/** The first-party onboarding Skill this repository publishes. */
export const ONBOARDING_SKILL_PATH = "skills/traj-onboarding/SKILL.md"

/** The first-party operating Skill this repository publishes, and the onboarding Skill installs. */
export const OPERATING_SKILL_PATH = "skills/traj/SKILL.md"

/** The networked install check the stubbed runs stand in for. */
export const INSTALL_CHECK = "scripts/check-skills-install.sh"

/** The one install command the Site prints, which the README and the onboarding Skill both name. */
export const WEBSITE_COMMAND = "npx skills add trajectonomics/skills --skill traj-onboarding"

/** The onboarding Skill's stable version: the repository tag, and the version the Site announces. */
export const SKILL_VERSION = "0.1.0"

/** The commit the stubbed `gh` resolves, which a repository-source run must name exactly. */
export const PINNED_COMMIT = "8f5595665a5bcb4058b798e08abb8800b9d3c461"

/** The [Skill Manifest](../../GLOSSARY.md) this repository publishes from. */
export const manifest: SkillManifest = parseSkillManifest(read(MANIFEST_PATH), MANIFEST_PATH)

/** The Skills the manifest publishes, in install order, which is what a pass of the check expects. */
export const PUBLISHED_SKILLS = manifest.skills.map((row) => row.name)

/** The one line that states the CLI Version Floor, as the Skill and an installed copy write it. */
export const FLOOR_LINE = `${CLI_VERSION_FLOOR_PREFIX}\`${CLI_VERSION_FLOOR}\``

/** One repository file as text. */
export function read(relativePath: string): string {
	return readFileSync(join(repoRoot, relativePath), "utf8")
}

/** The names under `skills/`, which is the set the manifest must match row for row. */
export function skillDirectories(): string[] {
	return readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort()
}

/** The Skill's source with its floor line removed, the way a stale installed copy arrives. */
export function withoutFloorLine(skillSource: string): string {
	const lines = skillSource.split(/\r?\n/)
	const kept = lines.filter((line) => !line.startsWith(CLI_VERSION_FLOOR_PREFIX))
	if (kept.length === lines.length) throw new Error(`no '${CLI_VERSION_FLOOR_PREFIX}' line`)
	return kept.join("\n")
}

/** The prose under one `## ` heading, line breaks flattened so a test quotes a sentence. */
export function section(skillSource: string, heading: string): string {
	const start = skillSource.indexOf(`## ${heading}`)
	if (start < 0) throw new Error(`the Skill has no "${heading}" section`)
	const next = skillSource.indexOf("\n## ", start + 1)
	return skillSource.slice(start, next < 0 ? skillSource.length : next).replace(/\s+/g, " ")
}

/** Every inline code span in a Skill, which is where a command a reader may run is named. */
export function codeSpans(skillSource: string): string[] {
	return [...skillSource.matchAll(/`([^`\n]+)`/g)].map((match) => match[1] ?? "")
}
