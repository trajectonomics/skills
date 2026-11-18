/**
 * The `computedHash` the `skills` CLI records in `skills-lock.json` for an installed Skill folder.
 * `scripts/check-skills-install.sh` recomputes it from the files an install left, so a lock that
 * disagrees with what is on disk is caught instead of trusted.
 *
 * The scheme is the CLI's own: sha256 over each file's relative path, a NUL, its byte length, a NUL
 * and its content, in path order, with CRLF folded to LF and the CLI's excluded names skipped.
 *
 *   bun scripts/skill-folder-hash.ts <installed-skill-directory>
 */
import { createHash } from "node:crypto"
import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs"
import { join } from "node:path"

/** Run metadata the CLI keeps beside a Skill rather than in it. */
const EXCLUDED_FILES = new Set(["metadata.json"])

/** Directories the CLI never hashes, because they are another tool's state. */
const EXCLUDED_DIRECTORIES = new Set([".git", "__pycache__", "__pypackages__"])

type HashedFile = { path: string; content: Buffer }

/** The hash of one Skill folder as installed, over the files it holds. */
export function skillFolderHash(directory: string): string {
	const files = collect(realpathSync(directory), realpathSync(directory), "")
	files.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)))
	const hash = createHash("sha256")
	for (const file of files) {
		hash.update(Buffer.from(file.path))
		hash.update("\0")
		hash.update(String(file.content.length))
		hash.update("\0")
		hash.update(file.content)
	}
	return hash.digest("hex")
}

/** Every file under `directory`, at the relative path the hash is computed over. */
function collect(directory: string, root: string, prefix: string): HashedFile[] {
	const files: HashedFile[] = []
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (EXCLUDED_FILES.has(entry.name)) continue
		const resolved = resolveInside(join(directory, entry.name), root)
		if (resolved === null) continue
		if (!isDirectory(resolved)) {
			files.push({ path: `${prefix}${entry.name}`, content: readBuffer(resolved) })
			continue
		}
		if (EXCLUDED_DIRECTORIES.has(entry.name)) continue
		const path = `${prefix}${entry.name}/`
		files.push(...collect(join(directory, entry.name), root, path))
	}
	return files
}

/** The real path of `path` when it sits inside `root`, or null when it is a link out of the folder. */
function resolveInside(path: string, root: string): string | null {
	try {
		const real = realpathSync(path)
		if (real === root || real.startsWith(`${root}/`)) return real
	} catch {
		return null
	}
	return null
}

/** Whether a resolved path is a directory, which a Skill folder's entries are walked for. */
function isDirectory(path: string): boolean {
	try {
		return lstatSync(path).isDirectory()
	} catch {
		return false
	}
}

/** A file's bytes with CRLF folded to LF, which is what the CLI hashes. */
function readBuffer(path: string): Buffer {
	const content = readFileSync(path)
	if (!content.includes("\r\n")) return content
	return Buffer.from(content.toString("latin1").replaceAll("\r\n", "\n"), "latin1")
}

if (import.meta.main) {
	const directory = process.argv[2]
	if (directory === undefined)
		throw new Error("usage: bun scripts/skill-folder-hash.ts <directory>")
	console.log(skillFolderHash(directory))
}
