import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { type InstallCheckFixture, prepareSandbox } from "./install-check-sandbox"
import { INSTALL_CHECK, repoRoot } from "./skills-files"

/**
 * Test scaffolding: the published files as a test reads them (re-exported from `skills-files.ts`), and
 * the stubbed install-check runner, so the check's assertions are proved without a network.
 */
export * from "./skills-files"

/** A stubbed install-check run: what the check said and the CLI calls each stub made. */
export function runInstallCheck(fixture: InstallCheckFixture = {}) {
	const sandbox = mkdtempSync(join(homedir(), ".cache", "skills-install-check-"))
	const prepared = prepareSandbox(sandbox, fixture)
	try {
		const result = Bun.spawnSync(["bash", INSTALL_CHECK, ...prepared.args], {
			cwd: repoRoot,
			env: {
				...process.env,
				PATH: `${join(sandbox, "bin")}:${process.env["PATH"] ?? ""}`,
				XDG_CACHE_HOME: join(sandbox, "cache"),
				...prepared.env,
			},
		})
		const lines = (path: string): string[] =>
			existsSync(path) ? readFileSync(path, "utf8").trim().split("\n") : []
		return {
			exitCode: result.exitCode ?? 1,
			output: `${result.stdout.toString()}${result.stderr.toString()}`,
			calls: lines(prepared.env.STUB_LOG),
			ghCalls: lines(prepared.env.STUB_GH_LOG),
			cacheLeftovers: readdirSync(join(sandbox, "cache")),
		}
	} finally {
		rmSync(sandbox, { recursive: true, force: true })
	}
}
