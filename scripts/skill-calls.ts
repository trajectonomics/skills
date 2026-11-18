/**
 * The calls a Skill's code spans name, and which published command each one is: the longest prefix of
 * `traj <words…>` that is a command the CLI publishes. Prose mentions, `npx`/`bunx` spans and paths
 * such as `~/.traj` are not calls and are never read as one.
 */
import type { PublishedCommand, PublishedSchema } from "./cli-schema"

/** One `traj …` call a Skill names, with the line it appears on. */
export type Call = { span: string; line: number }

/** Every `traj …` call a Skill's code spans name. */
export function calls(source: string): Call[] {
	return [...source.matchAll(/`([^`\n]+)`/g)]
		.map((match) => ({ span: (match[1] ?? "").trim(), at: match.index ?? 0 }))
		.filter((call) => /^traj\s+\S/.test(call.span))
		.map((call) => ({ span: call.span, line: source.slice(0, call.at).split("\n").length }))
}

/** The published command a call names, preferring the longest prefix that is one. */
export function resolveCommand(
	tokens: readonly string[],
	schema: PublishedSchema,
): { name: string; words: number } | null {
	const two = `${tokens[0]} ${tokens[1]}`
	if (schema.commands[two] !== undefined) return { name: two, words: 2 }
	const one = tokens[0]
	return one !== undefined && schema.commands[one] !== undefined ? { name: one, words: 1 } : null
}

/** `--dry-run` is the camelCase `dryRun` in the schema, so a multi-word flag is not a false failure. */
export function camelCase(flag: string): string {
	return flag.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

/** The tokens a call leaves as positionals, counting a value-flag's value as the flag\'s own. */
export function positionalsOf(rest: readonly string[], command: PublishedCommand): string[] {
	const positionals: string[] = []
	for (let at = 0; at < rest.length; at += 1) {
		const token = rest[at] ?? ""
		if (!token.startsWith("-")) {
			positionals.push(token)
			continue
		}
		const property = camelCase(token.replace(/^--?/, "").split("=")[0] ?? "")
		if (!command.booleans.includes(property) && !token.includes("=")) at += 1
	}
	return positionals
}

/** Every inline code span in one line, which is where a Skill names what it may run or state. */
export function codeSpans(line: string): string[] {
	return [...line.matchAll(/`([^`\n]+)`/g)].map((match) => (match[1] ?? "").trim())
}
