/**
 * The rule that keeps a Skill thin: it may name only what the published CLI publishes. A code span
 * whose first token is `traj` is read as a call — the command, then its flags and positionals — and a
 * flag is checked against that command's own input properties and the CLI's global options. A value a
 * Skill names is checked only where the schema publishes that flag's values, so a tax label that
 * appears only in a `description` is not published and naming it fails.
 *
 * A tax label is read wherever a Skill names one, by `scripts/skill-labels.ts`, not only inside a
 * call.
 *
 * It does not decide which unit a given flag or document takes; it fails the unit claims that are
 * wrong for every one of them (`cents`, `pence`, `×100`), which is the invented-unit rule.
 */
import type { PublishedCommand, PublishedSchema } from "./cli-schema"
import { calls, camelCase, positionalsOf, resolveCommand } from "./skill-calls"
import { labelFindings } from "./skill-labels"

/** One place a Skill names something the published CLI does not. */
export type Finding = { skill: string; span: string; problem: string }

/** Commands whose single `path` positional accepts any words, so a call may name a command in it. */
const ANY_WORDS: ReadonlySet<string> = new Set(["schema", "help"])

/** A unit claim that is wrong for every command, because the CLI keeps minor units and satang. */
const UNIT_CLAIM = /\bcents?\b|\bpence\b|×\s*100|(?:\*|multiply by) ?100\b|\bdivide by 100\b/i

/** Everything one Skill names that `schema` does not publish. */
export function commandSurfaceFindings(
	skill: string,
	source: string,
	schema: PublishedSchema,
): Finding[] {
	const found = calls(source).flatMap((call) => callFindings(skill, call.span, schema))
	const labels = labelFindings(source, schema).map((label) => ({ skill, ...label }))
	return [...found, ...labels, ...unitFindings(skill, source)]
}

/** A call on the bare command line, which takes the global options and no positionals. */
const ROOT_COMMAND: PublishedCommand = { positionals: [], properties: [], booleans: [], values: {} }

/** One `traj …` span, against the command it names. */
function callFindings(skill: string, span: string, schema: PublishedSchema): Finding[] {
	const tokens = span.split(/\s+/).slice(1)
	const command =
		tokens[0]?.startsWith("-") === true ? { name: "", words: 0 } : resolveCommand(tokens, schema)
	if (command === null) return [{ skill, span, problem: "names no command the CLI publishes" }]
	const rest = tokens.slice(command.words)
	const published = schema.commands[command.name] ?? ROOT_COMMAND
	return [
		...positionalFindings(skill, span, rest, published, command.name),
		...flagFindings(skill, span, rest, schema, command.name, published),
	]
}

/** A call may name no more positionals than its command publishes, unless the command takes words. */
function positionalFindings(
	skill: string,
	span: string,
	rest: readonly string[],
	command: PublishedCommand,
	commandName: string,
): Finding[] {
	const positionals = positionalsOf(rest, command)
	if (ANY_WORDS.has(commandName) || positionals.length <= command.positionals.length) return []
	return [
		{
			skill,
			span,
			problem: `names ${positionals.length} positionals, but ${commandName} publishes ${command.positionals.length}`,
		},
	]
}

/** Every flag in a call is published for that command, and every value it names is a published one. */
function flagFindings(
	skill: string,
	span: string,
	rest: readonly string[],
	schema: PublishedSchema,
	commandName: string,
	command: PublishedCommand,
): Finding[] {
	return rest.flatMap((token, at) => {
		const problem = flagProblem(token, rest[at + 1], schema, commandName, command)
		return problem === null ? [] : [{ skill, span, problem }]
	})
}

/** What is wrong with one token as a flag, or null when it is published as one. */
function flagProblem(
	token: string,
	next: string | undefined,
	schema: PublishedSchema,
	commandName: string,
	command: PublishedCommand,
): string | null {
	const flag = /^--([A-Za-z][\w-]*)(?:=(.*))?$/.exec(token)
	if (flag?.[1] === undefined) return null
	const property = camelCase(flag[1])
	if (!command.properties.includes(property) && !schema.globalOptions.includes(flag[1])) {
		return `names --${flag[1]}, which ${commandName} does not publish`
	}
	const value = flag[2] ?? (next?.startsWith("-") === false ? next : undefined)
	const publishedValues = command.values[property]
	if (value === undefined || publishedValues === undefined) return null
	const named = value.slice(value.indexOf("=") + 1)
	return publishedValues.includes(named)
		? null
		: `names the value "${named}", which ${commandName} does not publish`
}

/** A unit claim the CLI's own schema never makes, quoted where it appears. */
function unitFindings(skill: string, source: string): Finding[] {
	return source.split("\n").flatMap((line, index) => {
		const claim = UNIT_CLAIM.exec(line)
		if (claim === null) return []
		return [
			{
				skill,
				span: line.trim(),
				problem: `states the unit "${claim[0]}", which traj schema publishes nowhere (line ${index + 1})`,
			},
		]
	})
}
