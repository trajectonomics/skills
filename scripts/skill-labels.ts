/**
 * The tax labels a Skill names, against the ones the schema publishes as a value.
 *
 * A label is a dotted lowercase identifier, such as `income.section40_1`; a dotted span ending in a
 * file suffix (`traj.db`, `skills.manifest.json`) is a file this repository ships, not a label. Only a
 * value the schema lists is published, so on `@trajectonomics/cli@0.2.0` — whose `scenario tax`
 * carries `income.section40_1` only inside the `--label` flag's prose — every label a Skill names
 * fails, which is the rule that keeps the Thai tax recipe for the release that publishes it.
 */
import type { PublishedSchema } from "./cli-schema"
import { codeSpans } from "./skill-calls"

/** One label the schema does not publish, with the line it was named on. */
export type LabelFinding = { span: string; problem: string }

/** A dotted lowercase identifier, the shape a tax label takes (`income.section40_1`). */
const LABEL = /^[a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+$/

/** A dotted span ending in one of these is a file this repository ships, not a label. */
const FILE_SUFFIXES: ReadonlySet<string> = new Set([
	"db",
	"json",
	"lock",
	"md",
	"sh",
	"toml",
	"ts",
	"txt",
	"yaml",
	"yml",
])

/** Every label a Skill names, against the labels the schema publishes as a value. */
export function labelFindings(source: string, schema: PublishedSchema): LabelFinding[] {
	const published = publishedLabels(schema)
	return source.split("\n").flatMap((line, index) =>
		codeSpans(line)
			.filter(isLabel)
			.filter((label) => !published.has(label))
			.map((label) => ({
				span: label,
				problem: `names the label "${label}", which the schema publishes nowhere (line ${index + 1})`,
			})),
	)
}

/** The labels every command publishes as a value, which is the only place a label is published. */
function publishedLabels(schema: PublishedSchema): ReadonlySet<string> {
	const labels = Object.values(schema.commands).flatMap((command) =>
		Object.entries(command.values)
			.filter(([property]) => property.toLowerCase().includes("label"))
			.flatMap(([, values]) => values),
	)
	return new Set(labels)
}

/** Whether a code span is a tax label: the dotted shape, and not a file the repository ships. */
function isLabel(span: string): boolean {
	if (!LABEL.test(span)) return false
	return !FILE_SUFFIXES.has(span.slice(span.lastIndexOf(".") + 1))
}
