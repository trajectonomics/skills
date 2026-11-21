# ADR 0004: The CLI Range ceiling is a recheck marker, not a compatibility claim

**Status**: Accepted

## Context

A [CLI Range](../GLOSSARY.md) has two bounds, and they state two different things. Its lower bound is
the [CLI Version Floor](../GLOSSARY.md): the oldest `@trajectonomics/cli` release whose command surface
a published Skill assumes, which [ADR 0002](./0002-cli-version-floor.md) decided to declare and
disclose rather than probe. Its upper bound says when a new CLI minor needs the Skill rechecked
([GLOSSARY](../GLOSSARY.md)) — a reminder to this repository, not a claim about what the next release
will bring.

`traj-onboarding`'s Step 2 (#35, pull request #47) treated both bounds as one test: it installed a
manifest row only when the machine's command line "satisfied" its range, and skipped and named every
other row. With every row declaring `>=0.2.0 <0.3.0`, `Bun.semver.satisfies("0.3.0", ">=0.2.0 <0.3.0")`
is `false`, so the first CLI minor after 0.2.0 makes setup skip every Skill, `traj` — the contract —
included. The person who sets up the day after a release would receive a skip list instead of an
operating Skill.

That reading also contradicts the design it installs. Every published Skill takes its command, flags,
document shapes and enum values from `traj schema` at run time and stops where the schema disagrees
rather than inventing the gap, so a newer release cannot make the prose describe a command that release
lacks. The repository publishes no versioned set either (installs come from the default branch), so the
window between a CLI release and a manifest edit is the entire population of new installs in it. G1
counts people who keep using `traj`, and the 23 November 2026 checkpoint requires the published agent
skill.

## Decision

1. **The install gate is one-directional.** A manifest row is installed when the command line is at or
   above that row's CLI Range floor; below the floor it is skipped and named, with the range it wants
   and the reason. This replaces "a row is installed when the command line satisfies its range".
2. **Above the upper bound a Skill is installed, and disclosed.** `traj` and every
   [Recipe](../GLOSSARY.md) alike. At the handover, one sentence names each Skill whose range the
   command line has passed, the range it was checked through, and that `traj schema` is authoritative.
   Nothing is said when every installed Skill's range still covers the command line.
3. **The test is stated, not delegated to a range library.** The floor test is the version comparison
   the Skill already defines for Step 1: the first `X.Y.Z` token, the three numbers compared in turn, a
   pre-release below its release. `Bun.semver.satisfies("0.2.5-rc.1", ">=0.2.0 <0.3.0")` is `false`, so
   a literal range reading skips a command line that sits between the bounds. The disclosure compares
   the minor line of the upper bound, so a pre-release of the next minor (`0.3.0-rc.1`) is disclosed
   rather than silently treated as inside the range.
4. **The ranges are read from what is installed.** The disclosure reads each installed Skill's
   `metadata.cli`, which is the manifest row's derived copy. That keeps the manifest the one authored
   place for a range, works on a re-run where no manifest is fetched, and survives the documented
   fallback where the manifest cannot be read.
5. **Every row reads it the same way.** A later range gate — including the one #46 proposes for the
   handoff install — uses this floor test, so two gates on one set cannot contradict each other. The
   upper bound stays in every row and keeps meaning "recheck this Skill at the next CLI minor", so
   raising a floor and rechecking stay one edit.
6. **No manifest change.** Every row keeps `>=0.2.0 <0.3.0`; both bounds keep their meanings.

## Considered Options

- **Keep the symmetric skip and edit the manifest at every CLI minor.** Rejected: it leaves a window
  measured in hours after every release in which a new person gets nothing, for a bound that was never
  a compatibility claim.
- **Exempt `traj` alone and keep skipping Recipes above their range.** Rejected: it is a second rule to
  keep in step with the first, and a Recipe above its range already stops where the schema disagrees.
- **Raise every range with `>=0.2.0 <1.0.0` so the ceiling never trips.** Rejected: it deletes the
  recheck reminder this repository relies on, and it would state a compatibility promise no one has
  made.
- **Have a Recipe above its range refuse to run.** Rejected: the person's job is still blocked, and the
  schema-first stop rule already produces a stop at the exact point a moved command would matter.

## Consequences

- The first CLI minor no longer empties a new person's set: setup installs the published Skills and
  says, in one sentence, which range they were checked through.
- The disclosure is owed rather than skipped because a Skill does name a few calls (`traj init` and the
  two `--template` calls, pinned by the tests); a release that moved one of them makes the prose stale,
  and the sentence is where a person learns to trust the schema over the prose.
- The below-floor rule is unchanged: a row below its floor is skipped and named, and
  [ADR 0002](./0002-cli-version-floor.md)'s five-fact disclosure and "older, not broken, nothing is
  installed to fix it" stay exactly as they are.
- The upper bound keeps its own value: it still says which release needs this repository's recheck, so
  a CLI minor remains a maintenance signal rather than a customer outage.
- Both rules that decide setup is done count the disclosure, so setup cannot be declared finished with
  an above-range set left undisclosed.
