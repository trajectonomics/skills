---
name: traj-onboarding
description: "Set up `traj`, the personal money command line, for someone starting out: install the command line, install the skill that operates it, and start from their financial situation and their goal. Use when someone wants to get started with their money, asks to install `traj`, or tells you their financial situation and their goal while setup is not done."
metadata:
  version: "0.1.0"
---

# traj-onboarding

Set a person up on `traj`: install the command line, install the skill that operates it, and start
from their own money. Three steps, each with a check you run. A step whose check already passes is
done, and setup is finished when all three pass.

## Check what is already done

Run both checks first, so a machine that is half set up only gets the half it is missing.

- **Command line**: `traj --version`, then `npx -y @trajectonomics/cli@latest --version`. A version
  that prints is the command line. When the machine has neither, that first run of the scoped package
  fetches the binary once and caches it, so this check is also the install; it narrates the download
  on stderr, and a download line is not an error.
- **Scope and operating skill**: `npx skills list --json` and `npx skills list -g --json`. A project
  list that names `traj-onboarding` is this session's copy; when it does not, a global list that does
  is, and step 2 installs into that same scope. Read the operating skill out of that one scope's list:
  a skill named `traj` whose `source` is `trajectonomics/internal-skills` is the operating skill, and
  its `path` is where you read it. A `traj` in the other scope belongs to another setup.

When both pass, the step 3 question is answered, and a below-floor command line has been disclosed
where one exists, setup is done: this skill stops, and every later conversation about their money is
the operating skill's.

## Step 1: Install the command line

`traj --version` printing a version is the whole of this step, and the check above already runs the
fallback that prints one. Later calls reuse the cached binary, so nothing downloads twice.

The npm package is `@trajectonomics/cli`. Run it under that scoped name, with the arguments the
person's request needs:

```bash
npx -y @trajectonomics/cli@latest
bunx @trajectonomics/cli@latest
```

The command line needs Node 20 or later. The unscoped `traj` on npm is a different, unrelated
package.

**On PATH.** When the person wants to type `traj` on its own, read the Install section of
https://github.com/trajectonomics/cli, give them the one-line command for their platform, and let
them run it. Running a remote script is their decision to make, not yours. If that page cannot be
read, keep to the scoped package above and invent no script URL.

Done when a version prints.

The CLI version floor is `0.2.0`: the oldest `@trajectonomics/cli` release whose command surface the
operating skill in step 2 assumes. That release carries `projection run`, `projection compare`, `fi`
and `scenario tax` — named here for provenance only, since command shapes still come from
`traj schema` — and the issue that tracks it is `trajectonomics/cli#117`. Below the floor the
operating skill's `description` promises work the command line refuses.

The version to compare is the first version that printed — `traj --version` when a binary is on
`PATH`, otherwise the scoped package's. The unscoped `traj` on npm is a different, unrelated package:
when that print came from it, or you cannot tell which package printed it, compare the scoped
package's version instead. Read the first `X.Y.Z` token, keeping any `-prerelease` suffix; compare
the three numbers in turn and never the strings, so `0.10.0` is above `0.9.0`; and treat a pre-release
as below its release, so `1.4.0-rc.1` is below `1.4.0`.

## Step 2: Install the skill that operates `traj`

Install it in this skill's scope: add `-g` when the project list did not name `traj-onboarding` and
the global list did, and no flag otherwise, because the project copy is the one a session in a
project loads.

```bash
npx skills add trajectonomics/internal-skills --skill traj -y
```

That command adds only `traj`, and takes no agent filter, so the skills CLI installs for the agents
it detects. The person never opens that repository.

Done when that same scope's list names `traj` whose `source` is `trajectonomics/internal-skills`, and
you hold the `path` it reports.

## Step 3: Ask once, then hand over

Ask the person two things in one question: their financial situation, and their goal. Then read the
`traj` skill at the `path` the list command reported, and follow it for the rest of this
conversation.

Tell them that a new session loads that skill whenever they talk about their money, so this setup is
never needed again.

**Below the floor.** When the version that printed is below the CLI version floor, disclose it before
the handover, in these five facts: the version on this machine; the version the operating skill
expects; the work that still works — recording, reading balances and reports, and testing a Scenario;
the work that does not — a projection, a financial-independence date and a tax figure; and the release
that closes that gap, tracked as `trajectonomics/cli#117`. Say the command line is older, not broken,
and that nothing is installed or downloaded to fix it. Setup still finishes.

- Every number you give them is one `traj` returned. The tool owns what its own command surface
  lists — balances, and, from the floor up, projections, a financial-independence date and Thai tax;
  the person owns the facts that feed them. Below the floor, promise none of the last three.
- This skill states no tax meaning. From the floor up, tax is the operating skill's to explain; below
  it, no tax meaning is on offer from this machine.
- Commands, flags and document shapes come from `traj schema`, not from this document, because the
  command surface changes as features land.

Done when their answer is in hand, a below-floor command line has been disclosed where one exists,
and the operating skill is running the conversation.
