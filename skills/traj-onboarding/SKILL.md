---
name: traj-onboarding
description: "Set up `traj`, the personal money command line, for someone starting out, or set it up again on a machine that already has a ledger: install the command line, install the skill that operates it, and start from their financial situation and their goal. Use when someone wants to get started with their money, asks to install `traj`, or tells you their financial situation and their goal while setup is not done."
metadata:
  cli: ">=0.2.0 <0.3.0"
  version: "0.1.0"
---

# traj-onboarding

Set a person up on `traj`: install the command line, install the skill that operates it, and start
from their own money. Three steps, each with a check you run. A step whose check already passes is
done, and the first section says when setup is finished.

## Before anything downloads

Say these two things before the first command runs, because that command is the download:

- **Currency.** This version of `traj` is THB only. If their money is in another currency, say
  plainly that `traj` cannot hold it yet, and start no download: nothing is installed, nothing is
  fetched, and the conversation ends there. When you do not know their currency, ask, because a
  download is not the moment to find out.
- **Size.** The first run of the command line downloads about 100 MB of binary. Say so, so a person
  on a metered connection chooses when to run it.

## Check what is already done

Run all three checks first, so a machine that is half set up only gets the half it is missing, and a
person who has done this before is noticed before anything is installed.

- **Ledger File**: whether `${TRAJ_HOME:-~/.traj}/traj.db` is there. Test for existence and nothing
  more: never open the file, and never run a `traj` command to look for it, because every
  store-opening command creates the very file this check reads. The file means the ledger has been
  opened on this machine at least once; it never means the ledger holds data. The directory is not the
  signal either: the version check below creates it for a brand-new person, and only a store-opening
  command creates the file.
- **Command line**: `traj --version`, then `npx -y @trajectonomics/cli@latest --version`. A version
  that prints is the command line. When the machine has neither, that first run of the scoped package
  fetches the binary once and caches it, so this check is also the install; it narrates the download
  on stderr, and a download line is not an error.
- **Scope and operating skill**: `npx skills list --json` and `npx skills list -g --json`. A project
  list that names `traj-onboarding` is this session's copy; when it does not, a global list that does
  is, and step 2 installs into that same scope. Read the operating skill out of that one scope's list:
  a skill named `traj`, whose `source` is `trajectonomics/skills` like this one's, is the operating
  skill, and its `path` is where you read it. A `traj` in the other scope belongs to another setup.

When the two install checks pass and step 3 has ended — its question answered by the person directly
or grounded in the Ledger File they already have, or, where the read failed, that failure reported and
the handover made — and a below-floor command line has been disclosed where one exists, setup is done:
this skill stops, and every later conversation about their money is the operating skill's.

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

A person installs this skill with one command, and an unattended run appends `-y` to it:

```bash
npx skills add trajectonomics/skills --skill traj-onboarding
```

That is the command the Site prints. What this step installs is the published set, at the commit this
copy came from.

**Find the pin.** `skills@1.9.0` records, in `skills-lock.json`, the `commit` it installed this
skill from. Read this skill's own entry and that `commit`: everything below installs from it. Never install from `main`:
a branch moves, and a person's setup must not.

**Read the set at that commit.** Fetch `skills.manifest.json` from `trajectonomics/skills` at the
pinned commit. It lists every published skill, its directory and the CLI Range it expects, in install
order. Install each row in this skill's scope — add `-g` when the project list did not name
`traj-onboarding` and the global list did, and no flag otherwise — with an explicit `--skill` per
row, from the pin:

```bash
npx skills add trajectonomics/skills@<commit> --skill <name>
```

Skip a row whose CLI Range the command line does not satisfy, and name it with the range it wants and
the reason: a person on an older release is never handed a skill that would describe a command that
release lacks. When the manifest cannot be read, install `traj` alone from the pin and say in one
plain sentence that the rest of the set could not be read, so nobody is left without the contract.

Done when that same scope's list names every row you installed, `traj` among them, and you hold the
`path` each one reported.

## Step 3: Ask once, then hand over

Ask once, then hand over. Step 3 has one open for a machine with no Ledger File and one for a machine
that has one, and each open starts with its lead-in sentence in bold. The below-floor disclosure comes
in every open, before any handover — the failed read included.

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
- **A number they guessed is theirs, and you mark it rough.** Record it as they gave it, and report
  it as "rough — your estimate". A figure `traj` computed is never marked: that is the tool's answer
  and the point of the tool.

**A ledger file already exists.** Read the `traj` skill at the `path` the list command reported, and
follow it to read the ledger, taking every command and flag from the schema and none from this
document. Then report what it found before you ask anything, in one of three ways:

- **It holds rows.** Say what the ledger holds, in the names and numbers the read returned, and ask
  one question: does that match, and what is their goal now. The situation half is the ledger's to
  tell, and a job that started or an account that closed is the person's correction to make; the goal
  is not in the ledger and can change, so it is asked again. Fold their answer in and stay in the
  operating skill.
- **It holds nothing yet.** Say that the file is there and the ledger is empty, then ask the two
  questions the open below asks.
- **The read failed.** Report what the command line said, in its own words. Then hand the conversation
  over without an interview: a read that failed is no reason to make the person retype what may
  already be recorded there.

**No ledger file yet.** Ask the person two things in one question: their financial situation, and
their goal. **Enter a debt as a negative opening balance**, so that borrowing lowers net worth
instead of raising it; the command line does not yet normalise the sign, tracked as `trajectonomics/cli#149`, and a debt
recorded the obvious way reads as a gain. Then read the `traj` skill at the `path` the list command reported, and
follow it for the rest of this conversation.

Tell them, in every open, that a new session loads that skill by itself whenever they talk about their
money, and that another machine needs setup once.

Done when their answer is in hand — given directly, or confirmed against the Ledger File — or, where
the read failed, the failure has been reported and the conversation handed over; a below-floor command
line has been disclosed where one exists; and the operating skill is running the conversation.

## What setup leaves behind

Tell them, once, before the handover:

- **Where the data lives.** Everything is in `~/.traj`, and `TRAJ_HOME` moves it. The ledger itself
  makes no network connection: it computes on this machine and sends nothing anywhere. Two things do
  reach the network, and only these two — the binary download, and the `skills` CLI that installs
  these skills. Say exactly that, and nothing broader.
- **Never `rm -rf ~/.traj`.** That directory holds the ledger; removing it destroys every row, and no
  command in this version removes the data for you. After `trajectonomics/cli#148` this becomes the CLI's
  guarded command, and not before.
