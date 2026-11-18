---
name: traj-plan
description: "Answer planning questions with `traj`, the personal money command line: when someone can stop working, what a purchase or a raise would change, and what their plan looks like at a horizon they name. Use when someone asks about financial independence, retiring early, a projection, a what-if, a savings plan, or whether their money lasts."
metadata:
  cli: ">=0.2.0 <0.3.0"
---

# traj-plan

This is a Recipe: the policy of a planning conversation. Every command, flag, document field and unit
comes from the command line in front of you — `traj schema …` read as the `traj` Skill says — and
never from this file. When the schema does not publish something this Recipe needs, stop and say so
rather than approximating it.

The job: a person's own figures become a plan the tool computed, with its horizon and its
assumptions in plain sight, and with the things `traj` cannot do named instead of faked.

## Ask for the plan's facts, and never substitute one

Ask, and take no default:

- the **as-of**, the date the plan is read from;
- the **horizon**, the date the plan runs to;
- the **scenario** the plan runs under, by name, from `traj scenario list --json`;
- the facts behind that scenario — income, spending, contributions and withdrawals — as the person
  states them.

No date is read off the machine, and a missing as-of or horizon is a question, not a default. Never
substitute today for the as-of, and never stretch the horizon to reach a nicer answer.

## Read the tool's own document, never a remembered one

The Scenario is the tool's document. Start from what `traj scenario apply --template` prints, take
every field from the schema, and iterate on the tool's own errors: each names the path that is wrong,
and that error is the loop. Write the document to a file, dry-run it, then apply it under a name of
its own so the baseline stays untouched.

The plan's baseline is the person's ledger, so a balance the tool refuses as undeclared means the
Scenario does not carry that account yet: declare the account the ledger already has, rather than
renaming or dropping it.

## Step 1: the financial-independence date

Run `traj fi --as-of <as-of> --horizon <horizon> --scenario <scenario> --json`, and report:

- the FI date with **its horizon** and the assumptions it was computed under, taken from the
  Scenario's own document and the result's own notes;
- whether it is reachable at all: when the result says it is not reached within the horizon, say
  that, with the horizon, and do not extend the horizon silently to produce a date;
- the 25-times-annual-spending figure **only** as a labelled rule of thumb — the result itself
  labels that reference — and never as the FI date. The rule of thumb is not the projection's date,
  and the date does not carry it.

A figure without its horizon and assumptions is one the person will read as unconditional.

## Step 2: run the projection, and say when the plan runs out

Run `traj projection run --as-of <as-of> --horizon <horizon> --scenario <scenario> --json`, and
report plainly, each with the period it belongs to:

- any unfunded contribution — money the plan was supposed to add and could not;
- any run-out date — the point the money is gone before the horizon.

Say both before the year-by-year detail, and never round a shortfall away.

## Step 3: the what-if is the tool's own difference

A what-if is a second Scenario: fork or apply one, change only the field the person's sentence names,
and let `traj projection compare <a> <b> --as-of <as-of> --horizon <horizon> --json` report the
difference. The answer is that difference, never arithmetic of your own.

When the person's sentence names something the published schema has no field for, refuse it plainly:
say that this release of `traj` cannot express it, and leave the number missing. A what-if built on a
plan that already runs out of money or cannot fund its contributions is not presented as the plan:
say what the baseline does first, then the difference, in those words.

Turning their sentence into a document field is a reading of the schema, never an act of memory:
read the field from the schema, start from the release's template, and carry no field name with you.

## What every answer discloses

Every plan answer carries these, in plain words:

- **This is an estimate, not a filing.** In particular a tax figure from this tool is an estimate and
  nothing here is a tax return.
- **What is not modelled**, named for the question asked — the facts the Scenario does not carry.
- **What `traj` cannot do in this release**: it cannot produce a tax figure yet, it cannot hold a
  currency other than THB (so no USD), and it has no Monte Carlo, no return shock, and no
  "retire at 55" — a sentence like that is refused, not approximated. Leave the missing number
  missing.
- **The as-of every figure was read at, and whether tax is in it.** In this release tax is not.

## Never

- Never fill a gap with your own arithmetic, and never present an estimate as the tool's answer.
- Never report the 25-times figure as the FI date, and never report the FI date without its horizon.
- Never hide an unfunded contribution or a run-out behind a total that looks healthy.
- Never answer a what-if, a tax figure or a retirement age that the schema does not publish.
