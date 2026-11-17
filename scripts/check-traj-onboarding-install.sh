#!/usr/bin/env bash
# Proves what this repository publishes and what the two commands a visitor runs install: the website
# command installs the onboarding Skill and nothing else, onboarding's Step 2 adds the operating Skill
# beside it, and each installed copy keeps the metadata its own Skill claims.
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
OPERATING_SKILL="traj"
# The two Skills this repository publishes: the onboarding one, and the operating one it installs.
PUBLISHED_SKILLS=("$SKILL" "$OPERATING_SKILL")
PUBLISHED_SKILL_COUNT="${#PUBLISHED_SKILLS[@]}"
# The oldest @trajectonomics/cli release whose command surface the operating Skill this check installs
# assumes; scripts/cli-version-floor.ts pins the same number, and its test pins the two together.
CLI_VERSION_FLOOR="0.2.0"
CLI_VERSION_FLOOR_PREFIX='The CLI version floor is '
# What the installed operating Skill must say it is: the scoped command line package, and the rule that
# its command surface comes from the tool rather than from the Skill's own prose.
OPERATING_SKILL_MARKERS=("@trajectonomics/cli" "traj schema --json")
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

# The source publishes both Skills and nothing else. The vendored engineering Skills live in
# .agents/skills behind skills-lock.json, which the CLI hides, so any other name here is a first-party
# Skill shipped beside these two.
found_count="$(sed -n 's/.*Found \([0-9][0-9]*\) skills\{0,1\}.*/\1/p' "$SCRATCH/list.log" | head -n 1)"
if [ "$found_count" != "$PUBLISHED_SKILL_COUNT" ]; then
	cat "$SCRATCH/list.log" >&2
	fail "the source does not publish exactly $PUBLISHED_SKILL_COUNT Skills"
fi
for published in "${PUBLISHED_SKILLS[@]}"; do
	grep -Eq "(^|[^[:alnum:]_-])${published}[[:space:]]*$" "$SCRATCH/list.log" || {
		cat "$SCRATCH/list.log" >&2
		fail "the source does not publish $published"
	}
done

installed_in() {
	local dir="$1"
	[ -d "$dir" ] || return 0
	find "$dir" -mindepth 1 -maxdepth 1 -exec basename {} \; | sort
}

# The Skills installed in each directory the two agent targets write to, against the sorted set the
# step expects. An exact match also catches a vendored Skill following one in.
expect_installed() {
	local log="$1"
	local expected="$2"
	local skill_dir found
	for skill_dir in ".agents/skills" ".claude/skills"; do
		found="$(installed_in "$SCRATCH/project/$skill_dir")"
		if [ "$found" != "$expected" ]; then
			cat "$log" >&2
			fail "$skill_dir holds '$(echo "$found" | tr '\n' ' ')', expected exactly '$(echo "$expected" | tr '\n' ' ')'"
		fi
	done
}

# The top-level `name:` of a SKILL.md's frontmatter, and its `metadata.version` where it declares one.
frontmatter_name() {
	awk '
		/^---$/ { if (frontmatter) exit; frontmatter = 1; next }
		frontmatter && /^name:[[:space:]]*/ {
			sub(/^name:[[:space:]]*/, "")
			sub(/[[:space:]]+$/, "")
			gsub(/^"|"$/, "")
			print
			exit
		}
	' "$1"
}

metadata_version() {
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
	' "$1"
}

echo "Installing $SKILL into a scratch project, the way the website command does..."
mkdir -p "$SCRATCH/project"
(
	cd "$SCRATCH/project"
	git init -q
	bounded 600 npx -y "$SKILLS_CLI" add "$SOURCE" --skill "$SKILL" -a "${AGENTS[@]}" -y \
		>"$SCRATCH/add-website.log" 2>&1
) || {
	cat "$SCRATCH/add-website.log" >&2
	fail "skills add --skill $SKILL exited non-zero"
}

# The one-skill claim, which is still true of the command the website shows: the onboarding Skill and
# nothing else, in each directory the agent targets write to.
expect_installed "$SCRATCH/add-website.log" "$SKILL"

[ -f "$SCRATCH/project/.agents/skills/$SKILL/SKILL.md" ] ||
	fail "$SKILL/SKILL.md was not installed"

# The Site announces `metadata.version` as the stable marker, so an install that drops the frontmatter
# field would make the claim false. Read it out of the installed copy's metadata block, never the
# source.
installed_version="$(metadata_version "$SCRATCH/project/.agents/skills/$SKILL/SKILL.md")"
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

echo "Adding $OPERATING_SKILL with onboarding Step 2's command, in that same project..."
(
	cd "$SCRATCH/project"
	bounded 600 npx -y "$SKILLS_CLI" add "$SOURCE" --skill "$OPERATING_SKILL" -a "${AGENTS[@]}" -y \
		>"$SCRATCH/add-operating.log" 2>&1
) || {
	cat "$SCRATCH/add-operating.log" >&2
	fail "skills add --skill $OPERATING_SKILL exited non-zero"
}

# Step 2 adds one Skill and disturbs none: the project ends setup holding both, which is the state a
# person is in when the onboarding Skill hands the conversation over.
expect_installed "$SCRATCH/add-operating.log" "$(printf '%s\n%s' "$OPERATING_SKILL" "$SKILL")"

# The operating Skill declares no metadata.version, so there is no version to compare; what an
# installed copy must keep is its name and the two facts that make it the operating contract rather
# than an empty directory the CLI happened to create.
[ -f "$SCRATCH/project/.agents/skills/$OPERATING_SKILL/SKILL.md" ] ||
	fail "$OPERATING_SKILL/SKILL.md was not installed"
installed_name="$(frontmatter_name "$SCRATCH/project/.agents/skills/$OPERATING_SKILL/SKILL.md")"
[ "$installed_name" = "$OPERATING_SKILL" ] ||
	fail "the installed $OPERATING_SKILL/SKILL.md is named '${installed_name}', expected $OPERATING_SKILL"
for marker in "${OPERATING_SKILL_MARKERS[@]}"; do
	grep -Fq "$marker" "$SCRATCH/project/.agents/skills/$OPERATING_SKILL/SKILL.md" || {
		cat "$SCRATCH/add-operating.log" >&2
		fail "the installed $OPERATING_SKILL/SKILL.md does not contain '${marker}', so it is not the operating Skill this repository publishes"
	}
done

echo "PASS: the website command installs exactly the $SKILL Skill, Step 2 adds the $OPERATING_SKILL Skill beside it, and both installed copies keep what they claim."
echo "      Source: $SOURCE"
