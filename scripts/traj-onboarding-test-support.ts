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

/** The repository root, so a test reads the files a visitor receives, never a copied fixture. */
export const repoRoot = fileURLToPath(new URL("..", import.meta.url))

/** The first-party onboarding Skill this repository publishes. */
export const SKILL_PATH = "skills/traj-onboarding/SKILL.md"

/** The networked install check the stubbed runs stand in for. */
export const INSTALL_CHECK = "scripts/check-traj-onboarding-install.sh"

/** The Skill's stable version: the repository tag, and the version the Site announces. */
export const SKILL_VERSION = "0.1.0"

/** One repository file as text. */
export function read(relativePath: string): string {
	return readFileSync(join(repoRoot, relativePath), "utf8")
}

/** Stands in for `npx`: it logs its arguments and installs the one Skill it is handed. */
export const STUB_NPX = [
	"#!/usr/bin/env bash",
	"set -euo pipefail",
	'printf "%s\\n" "$*" >> "$STUB_LOG"',
	'case " $* " in',
	'  *" --list "*)',
	'    echo "Found 1 skill"',
	'    echo "    traj-onboarding"',
	"    ;;",
	"  *)",
	"    for dir in .agents/skills .claude/skills; do",
	'      mkdir -p "$dir/traj-onboarding"',
	'      cp "$STUB_SKILL" "$dir/traj-onboarding/SKILL.md"',
	"    done",
	"    ;;",
	"esac",
	"",
].join("\n")

/** A stubbed install-check run: what the check said and the CLI calls the stub made. */
export function runInstallCheck({ skill = read(SKILL_PATH) }: { skill?: string } = {}): {
	exitCode: number
	output: string
	calls: string[]
	cacheLeftovers: string[]
} {
	const sandbox = mkdtempSync(join(homedir(), ".cache", "traj-onboarding-check-"))
	const binDir = join(sandbox, "bin")
	const cache = join(sandbox, "cache")
	const log = join(sandbox, "npx.log")
	const stubSkill = join(sandbox, "SKILL.md")
	mkdirSync(binDir)
	mkdirSync(cache)
	writeFileSync(join(binDir, "npx"), STUB_NPX)
	chmodSync(join(binDir, "npx"), 0o755)
	writeFileSync(stubSkill, skill)
	try {
		const result = Bun.spawnSync(["bash", INSTALL_CHECK, "."], {
			cwd: repoRoot,
			env: {
				...process.env,
				PATH: `${binDir}:${process.env["PATH"] ?? ""}`,
				XDG_CACHE_HOME: cache,
				STUB_LOG: log,
				STUB_SKILL: stubSkill,
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
