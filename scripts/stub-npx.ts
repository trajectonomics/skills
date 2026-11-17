/**
 * The stand-in for `npx` that the install-check tests run, so `bun run check` proves the check's
 * assertions without a network. `scripts/check-traj-onboarding-install.sh` itself is exercised for
 * real before a pull request; nothing here replaces that run.
 */

/** The stub's `--list` output for the Skills it reports publishing. */
export function stubList(published: readonly string[]): string {
	const noun = published.length === 1 ? "skill" : "skills"
	return [`Found ${published.length} ${noun}`, ...published.map((name) => `    ${name}`), ""].join(
		"\n",
	)
}

/** Stands in for `npx`: it logs its arguments, lists the published Skills and installs what it is handed. */
export const STUB_NPX = [
	"#!/usr/bin/env bash",
	"set -euo pipefail",
	'printf "%s\\n" "$*" >> "$STUB_LOG"',
	'case " $* " in',
	'  *" --list "*)',
	'    cat "$STUB_LIST"',
	"    ;;",
	"  *)",
	'    skill=""',
	'    while [ "$#" -gt 0 ]; do',
	'      case "$1" in',
	'        --skill) skill="$2"; shift 2 || shift ;;',
	"        *) shift ;;",
	"      esac",
	"    done",
	"    for dir in .agents/skills .claude/skills; do",
	'      mkdir -p "$dir/$skill"',
	'      if [ -f "$STUB_SKILLS/$skill/SKILL.md" ]; then',
	'        cp "$STUB_SKILLS/$skill/SKILL.md" "$dir/$skill/SKILL.md"',
	"      fi",
	"    done",
	"    ;;",
	"esac",
	"",
].join("\n")
