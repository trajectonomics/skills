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

1. A Skill a customer runs publishes from `trajectonomics/skills`. This repository's customer Skills
   are first-party under the repository-root `skills/`: `traj-onboarding` and `traj`.
2. `traj-onboarding` installs the operating Skill from the same source as itself, with
   `npx skills add trajectonomics/skills --skill traj`.
3. `trajectonomics/internal-skills` keeps only the Skills an internal session runs. Its copy of
   `traj` is retired there rather than left as a second copy, tracked as
   `trajectonomics/internal-skills#27`.

## Consequences

- One copy of the operating Skill, published and pinned in the same repository as the Skill that
  installs it; a change to that Skill or to its [CLI Version Floor](../../GLOSSARY.md#cli-version-floor)
  is one change.
- This repository publishes two Skills. `scripts/check-traj-onboarding-install.sh` proves the source
  lists both, that the website command still installs exactly `traj-onboarding`, that onboarding's
  Step 2 adds `traj` beside it, and that each installed copy keeps the metadata its own Skill claims.
  The one-Skill claim survives only where it remains true: the command on the website.
- A Skill Pin for either customer Skill here would hide it from visitors, because the skills CLI hides
  a Skill named in `skills-lock.json`; both stay out of that file, and `bun run check` enforces it.
- `internal-skills` losing `traj` does not change a customer's install: they never had the source
  name to begin with, and onboarding now names one repository for both Skills.
