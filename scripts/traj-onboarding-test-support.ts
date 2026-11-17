import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { CLI_VERSION_FLOOR, CLI_VERSION_FLOOR_PREFIX } from "./cli-version-floor"
import { STUB_NPX, stubList } from "./stub-npx"

/** The repository root, so a test reads the files a visitor receives, never a copied fixture. */
export const repoRoot = fileURLToPath(new URL("..", import.meta.url))

/** The first-party onboarding Skill this repository publishes. */
export const SKILL_PATH = "skills/traj-onboarding/SKILL.md"

/** The first-party operating Skill this repository publishes, and the onboarding Skill installs. */
export const OPERATING_SKILL_PATH = "skills/traj/SKILL.md"

/** The networked install check the stubbed runs stand in for. */
export const INSTALL_CHECK = "scripts/check-traj-onboarding-install.sh"

/** The onboarding Skill's stable version: the repository tag, and the version the Site announces. */
export const SKILL_VERSION = "0.1.0"

/** The Skills the stub reports `--list` publishing, which is what a pass of the check expects. */
export const PUBLISHED_SKILLS = ["traj", "traj-onboarding"]

/** The one line that states the CLI Version Floor, as the Skill and an installed copy write it. */
export const FLOOR_LINE = `${CLI_VERSION_FLOOR_PREFIX}\`${CLI_VERSION_FLOOR}\``

/** The Skill's source with its floor line removed, the way a stale installed copy arrives. */
export function withoutFloorLine(skillSource: string): string {
	const lines = skillSource.split(/\r?\n/)
	const kept = lines.filter((line) => !line.startsWith(CLI_VERSION_FLOOR_PREFIX))
	if (kept.length === lines.length) throw new Error(`no '${CLI_VERSION_FLOOR_PREFIX}' line`)
	return kept.join("\n")
}

/** One repository file as text. */
export function read(relativePath: string): string {
	return readFileSync(join(repoRoot, relativePath), "utf8")
}

/** A stubbed install-check run: what the check said and the CLI calls the stub made. */
export function runInstallCheck({
	skill = read(SKILL_PATH),
	operatingSkill = read(OPERATING_SKILL_PATH),
	publishedSkills = PUBLISHED_SKILLS,
}: {
	skill?: string
	/** `null` installs the operating Skill's directory with no `SKILL.md`, the way a dead install looks. */
	operatingSkill?: string | null
	publishedSkills?: readonly string[]
} = {}): {
	exitCode: number
	output: string
	calls: string[]
	cacheLeftovers: string[]
} {
	const sandbox = mkdtempSync(join(homedir(), ".cache", "traj-onboarding-check-"))
	const binDir = join(sandbox, "bin")
	const cache = join(sandbox, "cache")
	const skillsDir = join(sandbox, "skills")
	const log = join(sandbox, "npx.log")
	const list = join(sandbox, "list.log")
	mkdirSync(binDir)
	mkdirSync(cache)
	for (const [name, source] of [
		["traj-onboarding", skill],
		["traj", operatingSkill],
	] as const) {
		mkdirSync(join(skillsDir, name), { recursive: true })
		if (source !== null) writeFileSync(join(skillsDir, name, "SKILL.md"), source)
	}
	writeFileSync(list, stubList(publishedSkills))
	writeFileSync(join(binDir, "npx"), STUB_NPX)
	chmodSync(join(binDir, "npx"), 0o755)
	try {
		const result = Bun.spawnSync(["bash", INSTALL_CHECK, "."], {
			cwd: repoRoot,
			env: {
				...process.env,
				PATH: `${binDir}:${process.env["PATH"] ?? ""}`,
				XDG_CACHE_HOME: cache,
				STUB_LOG: log,
				STUB_LIST: list,
				STUB_SKILLS: skillsDir,
			},
		})
		const calls = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : []
		return {
			exitCode: result.exitCode ?? 1,
			output: `${result.stdout.toString()}${result.stderr.toString()}`,
			calls,
			cacheLeftovers: readdirSync(cache),
		}
	} finally {
		rmSync(sandbox, { recursive: true, force: true })
	}
}
