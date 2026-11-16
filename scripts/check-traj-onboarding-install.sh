#!/usr/bin/env bash
# Proves that the command the website shows installs the onboarding Skill and nothing else from
# this repository, and that the installed copy keeps the `metadata.version` the Site names.
#
#   bash scripts/check-traj-onboarding-install.sh                       # this checkout
#   bash scripts/check-traj-onboarding-install.sh trajectonomics/skills # once it is on the default branch
#
# The website shows one command, so this check is what keeps it true. It needs the network and the
# skills CLI, so it stays out of `bun run check`; run it before opening a pull request that touches
# skills/ or the README's first screen.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="${1:-$REPO_ROOT}"
SKILL="traj-onboarding"
SKILL_VERSION="0.1.0"
# The oldest @trajectonomics/cli release whose command surface the operating Skill this check installs
# assumes; scripts/cli-version-floor.ts pins the same number, and its test pins the two together.
CLI_VERSION_FLOOR="0.2.0"
CLI_VERSION_FLOOR_PREFIX='The CLI version floor is '
SKILLS_CLI="skills@1.7.6"
AGENTS=(claude-code codex)
CACHE_ROOT="${XDG_CACHE_HOME:-$HOME/.cache}"

mkdir -p "$CACHE_ROOT"
SCRATCH="$(mktemp -d "$CACHE_ROOT/traj-onboarding-install.XXXXXX")"
trap 'rm -rf "$SCRATCH"' EXIT

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

# A download that hangs must not hold a Factory Claim open, so a missing bound is a failure rather
# than a warning. `timeout` is GNU/coreutils; macOS only has it through `gtimeout`.
bounded() {
	local limit_seconds="$1"
	shift
	if command -v timeout >/dev/null 2>&1; then
		timeout "$limit_seconds" "$@"
	elif command -v gtimeout >/dev/null 2>&1; then
		gtimeout "$limit_seconds" "$@"
	else
		fail "no timeout(1) or gtimeout(1) on PATH, and this check never runs unbounded (macOS: brew install coreutils)"
	fi
}

echo "Listing the Skills $SOURCE publishes with $SKILLS_CLI..."
if ! bounded 600 npx -y "$SKILLS_CLI" add "$SOURCE" --list >"$SCRATCH/list.log" 2>&1; then
	cat "$SCRATCH/list.log" >&2
	fail "skills add --list exited non-zero"
fi

# One Skill found and it is this one. The vendored engineering Skills live in .agents/skills behind
# skills-lock.json, which the CLI hides, so a second name here means a first-party Skill shipped
# beside the onboarding one.
if ! grep -Eq 'Found 1 skill([^s]|$)' "$SCRATCH/list.log"; then
	cat "$SCRATCH/list.log" >&2
	fail "the source does not publish exactly one Skill"
fi
grep -q "$SKILL" "$SCRATCH/list.log" || {
	cat "$SCRATCH/list.log" >&2
	fail "the one published Skill is not $SKILL"
}

echo "Installing it into a scratch project, the way the website command does..."
mkdir -p "$SCRATCH/project"
(
	cd "$SCRATCH/project"
	git init -q
	bounded 600 npx -y "$SKILLS_CLI" add "$SOURCE" --skill "$SKILL" -a "${AGENTS[@]}" -y \
		>"$SCRATCH/add.log" 2>&1
) || {
	cat "$SCRATCH/add.log" >&2
	fail "skills add exited non-zero"
}

installed_in() {
	local dir="$1"
	[ -d "$dir" ] || return 0
	find "$dir" -mindepth 1 -maxdepth 1 -exec basename {} \; | sort
}

# The one rule the check exists for: the onboarding Skill and nothing else, in each directory the
# two agent targets write to. An exact match also catches a vendored Skill following it in.
for skill_dir in ".agents/skills" ".claude/skills"; do
	found="$(installed_in "$SCRATCH/project/$skill_dir")"
	if [ "$found" != "$SKILL" ]; then
		cat "$SCRATCH/add.log" >&2
		fail "$skill_dir holds '$(echo "$found" | tr '\n' ' ')', expected exactly '$SKILL'"
	fi
done

[ -f "$SCRATCH/project/.agents/skills/$SKILL/SKILL.md" ] ||
	fail "$SKILL/SKILL.md was not installed"

# The Site announces `metadata.version` as the stable marker, so an install that drops the frontmatter
# field would make the claim false. Read it out of the installed copy's metadata block, never the
# source.
installed_version="$(
	awk '
		/^---$/ { if (frontmatter) exit; frontmatter = 1; next }
		frontmatter && /^[^[:space:]]/ { metadata = 0 }
		frontmatter && /^metadata:[[:space:]]*$/ { metadata = 1; next }
		metadata && /^[[:space:]]+version:[[:space:]]*/ {
			sub(/^[[:space:]]+version:[[:space:]]*/, "")
			sub(/[[:space:]]+$/, "")
			gsub(/^"|"$/, "")
			print
			exit
		}
	' "$SCRATCH/project/.agents/skills/$SKILL/SKILL.md"
)"
[ "$installed_version" = "$SKILL_VERSION" ] ||
	fail "the installed $SKILL/SKILL.md carries metadata.version '${installed_version}', expected $SKILL_VERSION (the Site names it as the stable marker)"

# The Skill hands the conversation to the operating Skill, whose description assumes a command line that
# can project, compute an FI date and apply Thai tax. It states the oldest release that carries them, so
# an installed copy that drops that line — or states another number — is not the copy this repository
# pins. Read the number out of the installed copy's body, the copy a visitor receives.
installed_floor="$(
	awk -v prefix="$CLI_VERSION_FLOOR_PREFIX" '
		index($0, prefix) == 1 {
			rest = substr($0, length(prefix) + 1)
			if (match(rest, /`[^`]+`/)) print substr(rest, RSTART + 1, RLENGTH - 2)
			exit
		}
	' "$SCRATCH/project/.agents/skills/$SKILL/SKILL.md"
)"
[ "$installed_floor" = "$CLI_VERSION_FLOOR" ] ||
	fail "the installed $SKILL/SKILL.md states the CLI version floor '${installed_floor}', expected $CLI_VERSION_FLOOR (the operating Skill it installs assumes that release)"

echo "PASS: the website command installs exactly the $SKILL Skill, and no other Skill from this repository."
echo "      Source: $SOURCE"
