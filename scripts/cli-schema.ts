/**
 * The published command surface, compacted from what the CLI itself prints: `traj schema --json` for
 * the command list, `traj schema <command> --json` for each command's positionals, input properties
 * and published values, and `traj help` for the global options. `scripts/cli-schema-fixture.ts`
 * generates it from an installed CLI; `scripts/skill-command-surface.ts` reads Skills against it.
 */

/** One command the CLI publishes: its positionals, input property names and enumerated values. */
export type PublishedCommand = {
	positionals: readonly string[]
	properties: readonly string[]
	/** The flags that take no value, so a call's positionals are counted from what is left. */
	booleans: readonly string[]
	/** The JSON values a property publishes, or an empty list when it publishes none. */
	values: Record<string, readonly string[]>
}

/** What one CLI release publishes, as one file. */
export type PublishedSchema = {
	version: string
	globalOptions: readonly string[]
	commands: Record<string, PublishedCommand>
}

/** The command names in `traj schema --json`, which is what a Skill may name. */
export function commandNames(schema: { commands: readonly { name: string }[] }): string[] {
	return schema.commands.map((command) => command.name)
}

/** The global options `traj help` prints, without the dashes the CLI writes them with. */
export function globalOptions(help: string): string[] {
	const block = /^(?:Global options|Options):\n((?:\s{2}-.*\n)+)/m.exec(help)
	if (!block) throw new Error("traj help prints no Options: block")
	const names = [...(block[1] ?? "").matchAll(/(?:^|\s)-{1,2}([A-Za-z][\w-]*)/g)].map(
		(match) => match[1] ?? "",
	)
	return [...new Set(names)].filter(Boolean).sort()
}

/** One command's schema output, reduced to what the check reads. */
export function publishedCommand(description: {
	positionals?: readonly string[]
	input?: { properties?: Record<string, Record<string, unknown>> }
}): PublishedCommand {
	const properties = description.input?.properties ?? {}
	return {
		positionals: description.positionals ?? [],
		properties: Object.keys(properties).sort(),
		booleans: Object.entries(properties)
			.filter(([, property]) => property["type"] === "boolean")
			.map(([name]) => name)
			.sort(),
		values: Object.fromEntries(
			Object.entries(properties).flatMap(([name, property]) => {
				const values = publishedValues(name, property)
				return values === null ? [] : [[name, values]]
			}),
		),
	}
}

/** The values one property publishes, which is only ever what its schema lists as a JSON value. */
function publishedValues(name: string, property: Record<string, unknown>): string[] | null {
	if (Array.isArray(property["enum"])) return property["enum"].map(String)
	const items = property["items"] as Record<string, unknown> | undefined
	if (!Array.isArray(items?.["enum"])) {
		return name.toLowerCase().includes("label") ? [] : null
	}
	return (items["enum"] as unknown[]).map(String)
}

/** The fixture as written, with commands in a stable order so a diff is a real change. */
export function fixtureJson(schema: PublishedSchema): string {
	const commands = Object.keys(schema.commands)
		.sort()
		.map((name) => [name, schema.commands[name]] as const)
	return `${JSON.stringify(
		{
			version: schema.version,
			globalOptions: schema.globalOptions,
			commands: Object.fromEntries(commands),
		},
		null,
		"\t",
	)}\n`
}

/** Whether two fixture files carry the same surface, whatever whitespace a formatter left. */
export function sameFixture(one: string, other: string): boolean {
	return canonical(one) === canonical(other)
}

/** A fixture as one string with its keys sorted, so a formatting change is not a drift. */
function canonical(json: string): string {
	return JSON.stringify(sortKeys(JSON.parse(json)))
}

/** Every object's keys in a fixed order, recursively. */
function sortKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortKeys)
	if (typeof value !== "object" || value === null) return value
	return Object.fromEntries(
		Object.keys(value)
			.sort()
			.map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
	)
}
