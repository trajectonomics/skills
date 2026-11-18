import { chmodSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { repoRoot } from "./repo"
import { manifest, PINNED_COMMIT, PUBLISHED_SKILLS, read } from "./skills-files"
import type { SkillPin } from "./skills-lock"
import { MANIFEST_PATH } from "./skills-manifest"
import { stubList } from "./stub-npx"

/** What one stubbed install-check run installs, and what the stubs leave behind for it to catch. */
export type InstallCheckFixture = {
	/** `local` runs the check against this checkout; `repo` names a repository and a commit. */
	source?: "local" | "repo"
	onboardingSkill?: string
	/** `null` installs the operating Skill's directory with no `SKILL.md`, the way a dead install looks. */
	operatingSkill?: string | null
	/** The Skills the source reports publishing, which is what `--list` prints. */
	publishedSkills?: readonly string[]
	/** The manifest the source publishes, which a repository-source run reads at its commit. */
	manifest?: string
	/** Per-Skill [Skill Pin](../GLOSSARY.md) fields a fixture replaces, as the CLI would have written them. */
	lockOverrides?: Record<string, Partial<SkillPin>>
	/** A Skill installed beside the published set that the manifest omits. */
	extraSkill?: string
	/** The commit the stubbed `gh` resolves, when it is not the one the check asked for. */
	resolvedCommit?: string
	/** Leaves an `agent/` skills tree in the project, the name Eve's tree uses. */
	agentDir?: boolean
	/** The argument to pass the check instead, for the sources it must refuse. */
	argument?: string
}

/** A run's `PATH` stubs and fixture variables, and the argument the check is called with. */
export type CheckSandbox = {
	env: {
		STUB_LOG: string
		STUB_LIST: string
		STUB_GH_LOG: string
		STUB_MANIFEST: string
		STUB_SKILLS: string
		STUB_LOCK_OVERRIDES: string
		STUB_GIT_SHA?: string
		STUB_EXTRA_SKILL?: string
		STUB_AGENT_DIR?: string
	}
	args: string[]
}

/** The sandbox a run needs: two stubs, the Skills a source publishes, and the fixture's wrong states. */
export function prepareSandbox(sandbox: string, fixture: InstallCheckFixture): CheckSandbox {
	const skills = join(sandbox, "skills")
	const env: CheckSandbox["env"] = {
		STUB_LOG: join(sandbox, "npx.log"),
		STUB_LIST: join(sandbox, "list.log"),
		STUB_GH_LOG: join(sandbox, "gh.log"),
		STUB_MANIFEST: join(sandbox, "manifest.json"),
		STUB_SKILLS: skills,
		STUB_LOCK_OVERRIDES: JSON.stringify(fixture.lockOverrides ?? {}),
	}
	mkdirSync(join(sandbox, "bin"))
	mkdirSync(join(sandbox, "cache"))
	writeSkills(skills, fixture)
	writeFileSync(env.STUB_LIST, stubList(fixture.publishedSkills ?? PUBLISHED_SKILLS))
	writeFileSync(env.STUB_MANIFEST, fixture.manifest ?? read(MANIFEST_PATH))
	launch(sandbox, "npx", "stub-npx")
	launch(sandbox, "gh", "stub-gh")
	if (fixture.extraSkill !== undefined) env.STUB_EXTRA_SKILL = fixture.extraSkill
	if (fixture.agentDir) env.STUB_AGENT_DIR = "1"
	if (fixture.resolvedCommit !== undefined) env.STUB_GIT_SHA = fixture.resolvedCommit
	return { env, args: sourceArgs(fixture) }
}

/** Every Skill the manifest publishes, at the fixture's copy of the two it can replace. */
function writeSkills(skills: string, fixture: InstallCheckFixture): void {
	for (const row of manifest.skills) {
		const source = copyOf(row.name, fixture)
		mkdirSync(join(skills, row.name), { recursive: true })
		if (source !== null) writeFileSync(join(skills, row.name, "SKILL.md"), source)
	}
}

/** One Skill's source: the fixture's replacement where it names one, else what this checkout ships. */
function copyOf(name: string, fixture: InstallCheckFixture): string | null {
	if (name === "traj-onboarding" && fixture.onboardingSkill !== undefined)
		return fixture.onboardingSkill
	if (name === "traj" && fixture.operatingSkill !== undefined) return fixture.operatingSkill
	return read(`skills/${name}/SKILL.md`)
}

/** The argument the run passes the check: this checkout, or a repository pinned to its commit. */
function sourceArgs(fixture: InstallCheckFixture): string[] {
	if (fixture.argument !== undefined) return [fixture.argument]
	return fixture.source === "repo" ? [`trajectonomics/skills@${PINNED_COMMIT}`] : ["."]
}

/** A stub on `PATH`: a Bun launcher for one `scripts/stub-*.ts` module. */
function launch(sandbox: string, command: string, module: string): void {
	const path = join(sandbox, "bin", command)
	writeFileSync(
		path,
		`#!/usr/bin/env bun\nimport { stubMain } from "file://${repoRoot}/scripts/${module}.ts"\nstubMain()\n`,
	)
	chmodSync(path, 0o755)
}
