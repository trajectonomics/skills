#!/usr/bin/env bash
# Proves that the command the website shows installs the onboarding Skill and nothing else from
# this repository.
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

echo "PASS: the website command installs exactly the $SKILL Skill, and no other Skill from this repository."
echo "      Source: $SOURCE"
