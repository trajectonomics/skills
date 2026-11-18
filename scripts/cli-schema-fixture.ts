/**
 * Writes the published command surface of one `@trajectonomics/cli` release, the fixture
 * `bun run check` reads Skills against and the online half of `scripts/skill-command-surface.ts`:
 *
 *   bun scripts/cli-schema-fixture.ts --floor 0.2.0 --out scripts/fixtures/cli-schema-0.2.0.json
 *   bun scripts/cli-schema-fixture.ts --floor 0.2.0 --out <live.json> --compare <checked-in.json>
 *   bun scripts/cli-schema-fixture.ts --floors   # the distinct floors the manifest declares
 *
 * `--compare` fails when the checked-in fixture has drifted from the published CLI, so the offline
 * half cannot pass against a surface the release no longer publishes.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { cliFloor } from "./cli-range"
import {
	commandNames,
	fixtureJson,
	globalOptions,
	type PublishedSchema,
	publishedCommand,
	sameFixture,
} from "./cli-schema"
import { repoRoot } from "./repo"
import { MANIFEST_PATH, parseSkillManifest } from "./skills-manifest"

/** One CLI call, bounded so a download cannot hang CI or a Factory Claim. */
function cli(floor: string, ...args: string[]): string {
	const result = Bun.spawnSync([
		"timeout",
		"600",
		"npx",
		"-y",
		`@trajectonomics/cli@${floor}`,
		...args,
	])
	if (result.exitCode !== 0) throw new Error(`traj ${args.join(" ")} failed: ${result.stderr}`)
	return result.stdout.toString()
}

/** The whole published surface of `floor`, read from the CLI itself. */
export function readPublishedSchema(floor: string): PublishedSchema {
	const help = cli(floor, "help")
	const commands = JSON.parse(cli(floor, "schema", "--json")) as {
		commands: { name: string; summary: string }[]
	}
	return {
		version: floor,
		globalOptions: globalOptions(help),
		commands: Object.fromEntries(
			commandNames(commands).map((name) => [
				name,
				publishedCommand(JSON.parse(cli(floor, "schema", ...name.split(" "), "--json"))),
			]),
		),
	}
}

/** The value after `flag` in `args`, or the explanation of what is missing. */
function flagValue(args: readonly string[], flag: string): string {
	const value = args[args.indexOf(flag) + 1]
	if (args.indexOf(flag) < 0 || value === undefined) throw new Error(`${flag} needs a value`)
	return value
}

if (import.meta.main) {
	const args = process.argv.slice(2)
	if (args.includes("--floors")) {
		const manifest = parseSkillManifest(readFileSync(join(repoRoot, MANIFEST_PATH), "utf8"))
		const floors = [...new Set(manifest.skills.map((row) => cliFloor(row.cliRange)))].sort()
		console.log(floors.join("\n"))
		process.exit(0)
	}
	const floor = flagValue(args, "--floor")
	const out = flagValue(args, "--out")
	const schema = readPublishedSchema(floor)
	writeFileSync(out, fixtureJson(schema))
	const compare = args.indexOf("--compare")
	if (compare >= 0) {
		const path = args[compare + 1]
		if (path === undefined) throw new Error("--compare needs a fixture path")
		const checkedIn = readFileSync(path, "utf8")
		if (!sameFixture(checkedIn, fixtureJson(schema))) {
			throw new Error(`${path} has drifted from @trajectonomics/cli@${floor}: regenerate it`)
		}
		console.log(`checked ${path} against @trajectonomics/cli@${floor}`)
	}
}
