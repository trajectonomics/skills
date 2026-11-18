---
name: traj-review
description: "Run a weekly or monthly check-in on someone's `traj` ledger: read the trial balance first, compare the period with the one before it, show every figure with its as-of and the entries behind it, keep refunds apart from gross spend, and apply one fixed rule for what counts as unusual. Use when someone asks how last week or last month went, wants a weekly or monthly review, or asks what changed in their spending."
metadata:
  cli: ">=0.2.0 <0.3.0"
---

# traj-review

This is a Recipe: the policy of one check-in. Every command and flag comes from the command line in
front of you — `traj schema …` read as the `traj` Skill says — and never from this file. When the
schema does not publish something this Recipe needs, stop and say so.

The job: a person names an as-of and a period, and gets a review they can check, with no figure
resting on the clock or on your judgement.

## The as-of and the period are the person's

Ask for both, and take no default:

- the **as-of**, the date the review is read at — a date the person gives, or one you ask for;
- the **period**, the stretch the review covers: a week is the seven days ending on the as-of, a
  month is the calendar month ending on the as-of.

Never read the clock, not even to fill the as-of, and never widen the period to make a comparison
come out. A request such as "last month" is turned into its two dates and restated before the
figures are read.

## Step 1: the trial balance first

Read `traj balance --as-of <as-of> --trial-balance --json` before any other figure. When debits and
credits disagree, stop: report the disagreement and the rows that carry it, and compute nothing
else. A review built on a ledger that does not balance is a review of the wrong numbers.

## Step 2: work out whether there is a prior period

The previous period is the same length immediately before the current one.

Find where the ledger's record starts: read `traj tx list --json` with no filters and take the
earliest date it holds. An opening balance is the first row of a real ledger, so that date is where
the record begins.

When the previous period would start before that date, the review says **no prior period** and
reports the current period alone. It never compares against days the ledger does not hold, and it
never reports a whole balance as one period's gain.

## Step 3: the figures, each with its as-of and the entries behind it

Read the period's own figures from the tool: `traj report pnl --since <start> --until <end> --json`
for income and expense by account, and `traj tx list --since <start> --until <end> --json` for the
entries themselves.

Every figure you report carries three things: the as-of it was read at, the two dates of its period,
and the entries behind it — the transaction ids, or "no entries" when there are none. A figure
without those is one the person will misread.

Use the tool's own totals; never re-add its rows. Report income and expense as the tool prints them,
and never flip a sign to make a sentence read better. State whether tax is in a figure: in this
release it is not.

## Step 4: refunds apart from gross spend

A refund is income returned to an expense account — money coming back on a purchase — and it is an
entry on that account with the opposite sign to the spending. Read both from the period's entries.

Show gross spend and refunds apart, each with its own total, and never net a refund into the
spending silently: a refunded purchase that is folded into gross spend hides both facts.

## Step 5: unusual is one fixed rule, printed with the review

The review prints this rule and then applies it, every time, so the person can see how "unusual" was
decided:

> An expense account is unusual when its period total exceeds 1.5 times the median of its up to three
> previous periods **and** exceeds 1,000 THB.

The details that make it one rule rather than a judgement:

- the previous periods are the same length as the current one, immediately before it — up to three
  of them, fewer when the record does not reach back that far;
- it needs at least two prior periods to have a baseline, so with fewer the review says
  **no baseline yet** for that account instead of naming it unusual;
- both conditions must hold; a small account many times its usual self is not unusual.

Never call anything else unusual, and never soften the rule with a remark about context.

## Step 6: what the review answers

In this order, and nothing before the trial balance:

1. the as-of, the period and whether it has a prior period;
2. the trial balance's state;
3. income, gross spend and refunds for the period, each with its entries;
4. the same figures for the previous period, or **no prior period**;
5. the unusual accounts, or **no baseline yet**, or "none";
6. the rule from Step 5, printed once.

## Unattended

State the assumptions in the review instead of asking: the period it read, that the as-of is the one
supplied, that there is no prior period or no baseline when that is so. Ask nothing. An as-of the
request does not carry is a stop, not a substitution, because the ledger has no clock and neither
does this Recipe.

## What this Recipe never does

- It never reads the clock, and never chooses the as-of or the period for the person.
- It never reports a figure without its as-of and the entries behind it.
- It never nets a refund into gross spend, and never invents a second rule for unusual.
- It never writes to the ledger: a review reads, and every write belongs to another Recipe.
