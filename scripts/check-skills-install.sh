#!/usr/bin/env bash
# Proves the published set. Every Skill the Skill Manifest lists is installed by explicit `--skill`
# from one 40-character commit, in manifest order, on skills@1.9.0, which records the commit; and the
# check fails on a Skill outside the manifest, on a Skill Pin that disagrees (source, commit or hash
# recomputed from the installed files), on a stray `agent/` skills tree, and on a published Skill
# installed from another source.
#
#   bash scripts/check-skills-install.sh                       # trajectonomics/skills at its default tip
#   bash scripts/check-skills-install.sh trajectonomics/skills@<40-character commit>
#   bash scripts/check-skills-install.sh /path/to/this/checkout # a local source, which pins no commit
#
# It needs the network and the skills CLI, so it stays out of `bun run check`; run it before opening a
# pull request that touches skills/, the manifest or the README's first screen.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_ARG="${1:-trajectonomics/skills}"
SKILLS_CLI="skills@1.9.0"
AGENTS=(claude-code codex)
ONBOARDING_SKILL="traj-onboarding"
SKILL_VERSION="0.1.0"
# The oldest release whose command surface the operating Skill assumes, read from the manifest and
# never authored here; the tests pin the two together and the frontmatter copy is generated too.
FLOOR_PREFIX='The CLI version floor is '
# What the installed operating Skill must say it is: the scoped command line package, and the rule that
# its command surface comes from the tool rather than from the Skill's own prose.
OPERATING_SKILL_MARKERS=("@trajectonomics/cli" "traj schema --json")
CACHE_ROOT="${XDG_CACHE_HOME:-$HOME/.cache}"

mkdir -p "$CACHE_ROOT"
SCRATCH="$(mktemp -d "$CACHE_ROOT/skills-install.XXXXXX")"
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

# The source the check installs from, the commit it pins, and the manifest it compares against. A
# repository source is pinned by an explicit commit and its manifest is read at that commit, so a
# source cannot publish a Skill set this checkout's manifest happens to match. A local checkout
# records no commit in the lock, because skills@1.9.0 pins only a repository source.
resolve_source() {
	if [ -d "$1" ]; then
		SOURCE="$(cd "$1" && pwd -P)"
		INSTALLED="$(git -C "$SOURCE" rev-parse HEAD 2>/dev/null)" ||
			fail "$SOURCE is not a git checkout, so there is no commit to install from"
		INSTALL_SOURCE="$SOURCE"
		LOCK_COMMIT="-"
		MANIFEST_FILE="$SOURCE/skills.manifest.json"
		return
	fi
	case "$1" in
	*@*) ;;
	*) fail "name the commit to install: <owner>/<repo>@<40-character commit>, or a checkout path" ;;
	esac
	SOURCE="${1%@*}"
	REF="${1##*@}"
	printf '%s' "$REF" | grep -Eq '^[0-9a-f]{40}$' ||
		fail "a commit is 40 lowercase hex characters, not '$REF' (a branch or a tag is not a pin)"
	bounded 60 gh api "repos/$SOURCE/commits/$REF" --jq .sha >"$SCRATCH/commit.log" 2>&1 ||
		{ cat "$SCRATCH/commit.log" >&2; fail "$SOURCE has no readable commit $REF"; }
	[ "$(cat "$SCRATCH/commit.log")" = "$REF" ] ||
		fail "$SOURCE does not resolve $REF to that commit"
	INSTALLED="$REF"
	INSTALL_SOURCE="$SOURCE@$REF"
	LOCK_COMMIT="$REF"
	bounded 60 gh api "repos/$SOURCE/contents/skills.manifest.json?ref=$REF" \
		-H "Accept: application/vnd.github.raw" >"$SCRATCH/manifest.json" 2>"$SCRATCH/manifest.err" ||
		{ cat "$SCRATCH/manifest.err" >&2; fail "$SOURCE states no skills.manifest.json at $REF"; }
	MANIFEST_FILE="$SCRATCH/manifest.json"
}

echo "Installing from $SOURCE_ARG..."
resolve_source "$SOURCE_ARG"
ROWS="$(cd "$REPO_ROOT" && bun scripts/skills-manifest-cli.ts "$MANIFEST_FILE")" ||
	fail "the manifest at $MANIFEST_FILE does not parse"
[ -n "$ROWS" ] || fail "the manifest at $MANIFEST_FILE lists no Skill"
NAMES="$(printf '%s\n' "$ROWS" | cut -f1)"
ROW_COUNT="$(printf '%s\n' "$NAMES" | wc -l | tr -d ' ')"
FLOOR="$(cd "$REPO_ROOT" && bun scripts/skills-manifest-cli.ts "$MANIFEST_FILE" --floor)"
printf '%s\n' "$NAMES" | grep -qx "$ONBOARDING_SKILL" ||
	fail "the manifest does not list $ONBOARDING_SKILL, which the website command installs"
echo "Manifest: $MANIFEST_FILE"
echo "Commit:   $INSTALLED"
echo "Skills:   $(printf '%s ' $NAMES)"
echo "Floor:    $FLOOR"

echo "Listing the Skills $INSTALL_SOURCE publishes with $SKILLS_CLI..."
if ! bounded 600 npx -y "$SKILLS_CLI" add "$INSTALL_SOURCE" --list >"$SCRATCH/list.log" 2>&1; then
	cat "$SCRATCH/list.log" >&2
	fail "skills add --list exited non-zero"
fi
found_count="$(sed -n 's/.*Found \([0-9][0-9]*\) skills\{0,1\}.*/\1/p' "$SCRATCH/list.log" | head -n 1)"
if [ "$found_count" != "$ROW_COUNT" ]; then
	cat "$SCRATCH/list.log" >&2
	fail "the source publishes '${found_count}' Skills, the manifest lists $ROW_COUNT"
fi
for published in $NAMES; do
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
# step expects. An exact match also catches a Skill outside the manifest following one in.
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

echo "Installing $ONBOARDING_SKILL into a scratch project, the way the website command does..."
mkdir -p "$SCRATCH/project"
(
	cd "$SCRATCH/project"
	git init -q
	bounded 600 npx -y "$SKILLS_CLI" add "$INSTALL_SOURCE" --skill "$ONBOARDING_SKILL" -a "${AGENTS[@]}" -y \
		>"$SCRATCH/add-website.log" 2>&1
) || {
	cat "$SCRATCH/add-website.log" >&2
	fail "skills add --skill $ONBOARDING_SKILL exited non-zero"
}

# The one-Skill claim, which is still true of the command the website shows: the onboarding Skill and
# nothing else, in each directory the agent targets write to.
expect_installed "$SCRATCH/add-website.log" "$ONBOARDING_SKILL"

[ -f "$SCRATCH/project/.agents/skills/$ONBOARDING_SKILL/SKILL.md" ] ||
	fail "$ONBOARDING_SKILL/SKILL.md was not installed"

# The Site announces `metadata.version` as the stable marker, so an install that drops the frontmatter
# field would make the claim false. Read it out of the installed copy's metadata block, never the source.
installed_version="$(metadata_version "$SCRATCH/project/.agents/skills/$ONBOARDING_SKILL/SKILL.md")"
[ "$installed_version" = "$SKILL_VERSION" ] ||
	fail "the installed $ONBOARDING_SKILL/SKILL.md carries metadata.version '${installed_version}', expected $SKILL_VERSION (the Site names it as the stable marker)"

# The Skill hands the conversation to the operating Skill, so it states that Skill's floor. An
# installed copy that drops the line — or states another number — is not the copy this repository
# publishes. The number comes from the manifest, never from this script.
installed_floor="$(
	awk -v prefix="$FLOOR_PREFIX" '
		index($0, prefix) == 1 {
			rest = substr($0, length(prefix) + 1)
			if (match(rest, /`[^`]+`/)) print substr(rest, RSTART + 1, RLENGTH - 2)
			exit
		}
	' "$SCRATCH/project/.agents/skills/$ONBOARDING_SKILL/SKILL.md"
)"
[ "$installed_floor" = "$FLOOR" ] ||
	fail "the installed $ONBOARDING_SKILL/SKILL.md states the CLI version floor '${installed_floor}', expected $FLOOR from the Skill Manifest (the operating Skill it installs assumes that release)"

echo "Installing every manifest Skill by explicit --skill, in manifest order..."
while IFS=$'\t' read -r name path range; do
	[ -n "$name" ] || continue
	# The website command above already installed this one, from the same commit and with the same
	# flags the manifest row asks for.
	[ "$name" != "$ONBOARDING_SKILL" ] || continue
	(
		cd "$SCRATCH/project"
		bounded 600 npx -y "$SKILLS_CLI" add "$INSTALL_SOURCE" --skill "$name" -a "${AGENTS[@]}" -y \
			>>"$SCRATCH/add-set.log" 2>&1
	) || {
		cat "$SCRATCH/add-set.log" >&2
		fail "skills add --skill $name exited non-zero"
	}
done <<<"$ROWS"

# Step 2 adds Skills and disturbs none: the project ends setup holding the published set, in both
# agent trees, and nothing the manifest does not list.
expect_installed "$SCRATCH/add-set.log" "$(printf '%s\n' "$NAMES" | sort)"

for name in $NAMES; do
	[ -f "$SCRATCH/project/.agents/skills/$name/SKILL.md" ] ||
		fail "$name/SKILL.md was not installed"
	installed_name="$(frontmatter_name "$SCRATCH/project/.agents/skills/$name/SKILL.md")"
	[ "$installed_name" = "$name" ] ||
		fail "the installed $name/SKILL.md is named '${installed_name}', expected $name"
done

for marker in "${OPERATING_SKILL_MARKERS[@]}"; do
	grep -Fq "$marker" "$SCRATCH/project/.agents/skills/traj/SKILL.md" || {
		cat "$SCRATCH/add-set.log" >&2
		fail "the installed traj/SKILL.md does not contain '${marker}', so it is not the operating Skill this repository publishes"
	}
done

# A second skills tree is a second copy that can drift, and the name Eve's tree uses is `agent/`, not
# `.agent/`, so it would sit beside the two the CLI writes without anyone noticing.
if [ -e "$SCRATCH/project/agent" ]; then
	fail "the install left an agent/ skills tree in the project, beside .agents/skills"
fi

# The lock is the oracle for what was installed, and it is recomputed rather than trusted: a missing
# entry, another source, another commit or a hash that disagrees with the installed files each fail.
[ -f "$SCRATCH/project/skills-lock.json" ] || fail "the install left no skills-lock.json"
if ! (cd "$REPO_ROOT" && bun scripts/check-skills-lock.ts "$SCRATCH/project" "$SOURCE" "$LOCK_COMMIT" "$MANIFEST_FILE") >"$SCRATCH/lock.log" 2>&1; then
	cat "$SCRATCH/lock.log" >&2
	fail "skills-lock.json does not match the set the manifest publishes"
fi

echo "PASS: the $ROW_COUNT Skills the manifest lists install from one commit, the website command installs exactly $ONBOARDING_SKILL, and every Skill Pin agrees with the installed files."
echo "      Source: $INSTALL_SOURCE"
echo "      Commit: $INSTALLED"
