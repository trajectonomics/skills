# ADR 0003: Customer Skills publish from this repository

**Status**: Accepted

## Context

`traj-onboarding` set a person up on `traj` and then installed the operating Skill from
`trajectonomics/internal-skills`, this organisation's repository of internal workflow Skills
(`human-go`, `human-decline`, `human-help`, `human-postpone`, `introduce-new-sub`,
`pick-the-issue`). A customer runs `traj` every day and is not an internal session, so onboarding
handed them a Skill published from `trajectonomics/internal-skills`, a repository they were never
told about — the Skill said as much: "The person never opens that repository". Two
consequences followed. The [CLI Version Floor](./0002-cli-version-floor.md) became a claim about a
Skill in another repository, so raising it needed a change here and a matching release there. And the
operating Skill's own text, the thing that decides whether a customer's agent follows the shipped
contract, was pinned by no check in the repository that shipped it.

## Decision

1. A Skill a customer runs publishes from `trajectonomics/skills`. The set this repository publishes
   is an allowlist in `skills.manifest.json` at the repository root: one row per Skill, naming its
   directory and the [CLI Range](../GLOSSARY.md) it expects, in install order. Today the rows are
   `traj-onboarding` and `traj`. A row with no `skills/<name>` directory, a directory with no row, a
   duplicate name or path, and a row whose range does not parse each fail `bun run check`, so
   publishing a seventh Customer Skill is one row and one checked set rather than an edit here.
2. `traj-onboarding` installs the operating Skill from the same source as itself, with
   `npx skills add trajectonomics/skills --skill traj`.
3. `trajectonomics/internal-skills` keeps only the Skills an internal session runs. Its copy of
   `traj` is retired there rather than left as a second copy, tracked as
   `trajectonomics/internal-skills#27`.

## Consequences

- One copy of the operating Skill, published and pinned in the same repository as the Skill that
  installs it; a change to that Skill or to its [CLI Version Floor](../../GLOSSARY.md#cli-version-floor)
  is one change.
- This repository publishes the Skills its manifest lists. `scripts/check-skills-install.sh` proves
  that set: it installs every listed Skill by an explicit `--skill` from one 40-character commit on
  `skills@1.9.0`, and fails on a Skill outside the manifest, on a `skills-lock.json` entry whose
  source, commit or recomputed hash disagrees, on a stray `agent/` skills tree, and on any listed
  Skill installed from another source. The one-Skill claim survives only where it remains true: the
  command on the website installs exactly `traj-onboarding`.
- A published Skill names nothing the published CLI does not. CI reads every `traj …` code span in
  every listed Skill at that Skill's [CLI Range](../GLOSSARY.md) floor and fails an unknown command,
  an unpublished flag or positional, an unpublished tax label, and an invented unit. Policy and
  Recipes stay the Skill's; the command surface stays the tool's.
- A Skill Pin for either customer Skill here would hide it from visitors, because the skills CLI hides
  a Skill named in `skills-lock.json`; none is pinned, and `bun run check` enforces it.
- `internal-skills` losing `traj` does not change a customer's install: they never had the source
  name to begin with, and onboarding now names one repository for both Skills.
