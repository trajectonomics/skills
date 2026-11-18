/**
 * The stand-in for `gh` that the install-check tests run, so the check's reading of the source at a
 * pinned commit is proved without a network: it answers a commit lookup with the commit it was asked
 * for (or a fixture's different one, which the check must refuse), and the manifest lookup with the
 * manifest the fixture publishes at that commit.
 */
import { appendFileSync, readFileSync } from "node:fs"

/** The value `STUB_*` names, refusing a run that forgot to provide it. */
function required(name: string): string {
	const value = process.env[name]
	if (value === undefined) throw new Error(`stub gh: no ${name}`)
	return value
}

/** Stands in for one `gh api` call whose path is a commit or the manifest at a commit. */
export function stubMain(): void {
	const args = process.argv.slice(2)
	appendFileSync(required("STUB_GH_LOG"), `${args.join(" ")}\n`)
	const path = args.find((arg) => arg.startsWith("repos/")) ?? ""
	if (path.includes("/contents/skills.manifest.json")) {
		process.stdout.write(readFileSync(required("STUB_MANIFEST"), "utf8"))
		return
	}
	if (path.includes("/commits/")) {
		const asked = path.slice(path.indexOf("/commits/") + "/commits/".length).split("?")[0] ?? ""
		process.stdout.write(`${process.env["STUB_GIT_SHA"] ?? asked}\n`)
		return
	}
	throw new Error(`stub gh: nothing to answer: ${args.join(" ")}`)
}

if (import.meta.main) stubMain()
