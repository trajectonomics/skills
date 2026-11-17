# ADR 0002: The onboarding Skill declares a CLI version floor

**Status**: Accepted

The onboarding Skill hands the conversation to the operating Skill (`traj`, which publishes from
this repository where [ADR 0003](./0003-customer-skills-publish-from-this-repository.md) records the
move), whose `description` assumes a command line that can project,
compute a financial-independence date and apply Thai tax. Those commands exist on the CLI's `main`
and not in its only published release, so the Skill declares the oldest release that carries them —
the [CLI Version Floor](../GLOSSARY.md) — and compares it with the version setup already prints,
disclosing a shortfall instead of handing over silently.

We chose a declared number over probing `traj schema` at setup: the probe duplicates the rule the
operating Skill already gives ("commands, flags and document shapes come from `traj schema`"), costs
a CLI round trip before that Skill is read, and cannot be asserted by `bun run check`, while one
number can be pinned by both the install check and the tests.

## Consequences

- The floor is a claim about another repository's release. When that release is cut
  (`trajectonomics/cli#117`), the number and the release must agree; a release that ships less than
  its title promises — the tax fix recorded in `trajectonomics/cli#114` — moves the floor rather than
  proving it.
- The floor may legitimately run ahead of `npm dist-tags.latest`. A person below it is told, not
  blocked, because recording, reading and Scenarios work on the older command line; setup still
  finishes.
- Raising the floor is a one-line edit in the onboarding Skill, and both pins — the install check and
  the test side — fail until they state the same number.
