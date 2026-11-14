---
name: traj-onboarding
description: "Set up `traj`, the personal money command line, for someone starting out: install the command line, install the skill that operates it, and start from their financial situation and their goal. Use when someone wants to get started with their money, asks to install `traj`, or tells you their financial situation and their goal while setup is not done."
---

# traj-onboarding

Set a person up on `traj`: install the command line, install the skill that operates it, and start
from their own money. Three steps, each with a check you run. A step whose check already passes is
done, and setup is finished when all three pass.

## Check what is already done

Run both checks first, so a machine that is half set up only gets the half it is missing.

- **Command line**: `traj --version`, then `npx -y @trajectonomics/cli@latest --version`. A version
  that prints is the command line.
- **Operating skill**: `npx skills list --json`, and `npx skills list -g --json` when this skill was
  installed globally. A skill named `traj` whose `source` is `trajectonomics/internal-skills` is the
  operating skill, and its `path` is where you read it.

When both pass and the step 3 question is answered, setup is done: this skill stops, and every later
conversation about their money is the operating skill's.

## Step 1: Install the command line

The npm package is `@trajectonomics/cli`. Run it under that scoped name, with the arguments the
person's request needs:

```bash
npx -y @trajectonomics/cli@latest
bunx @trajectonomics/cli@latest
```

The first run fetches a binary of about 100 MB and narrates it on stderr; a download line is not a
failure. The command line needs Node 20 or later. The unscoped `traj` on npm is a different,
unrelated package.

**On PATH.** When the person wants to type `traj` on its own, read the Install section of
https://github.com/trajectonomics/cli, give them the one-line command for their platform, and let
them run it. Running a remote script is their decision to make, not yours. If that page cannot be
read, keep to the scoped package above and invent no script URL.

Done when a version prints.

## Step 2: Install the skill that operates `traj`

Install it in this skill's own scope: add `-g` when `npx skills list -g --json` reported
`traj-onboarding`, and no flag when the project list reported it.

```bash
npx skills add trajectonomics/internal-skills --skill traj -y
```

That command adds only `traj`, and takes no agent filter, so the skills CLI installs for the agents
it detects. The person never opens that repository.

Done when `npx skills list --json` (or `-g`) names `traj`, and you hold the `path` it reports.

## Step 3: Ask once, then hand over

Ask the person two things in one question: their financial situation, and their goal. Then read the
`traj` skill at the `path` the list command reported, and follow it for the rest of this
conversation.

Tell them that a new session loads that skill whenever they talk about their money, so this setup is
never needed again.

- Every number you give them is one `traj` returned. The tool owns balances, projections and dates;
  the person owns the facts that feed them.
- This skill states no tax meaning. Tax is the operating skill's to explain, and every `traj` result
  says whether tax is applied.
- Commands, flags and document shapes come from `traj schema`, not from this document, because the
  command surface changes as features land.

Done when their answer is in hand and the operating skill is running the conversation.
