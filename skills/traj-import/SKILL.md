---
name: traj-import
description: "Bring a bank or card statement into `traj`, the personal money command line: read the export's header, choose its signed-amount mapping, chart every counterparty, date the opening balance, import once with an idempotency key, and prove the result against the statement's closing balance. Use when someone has a bank export or CSV to import, asks to load a statement, or wants last month's transactions in their ledger."
metadata:
  cli: ">=0.2.0 <0.3.0"
---

# traj-import

This is a Recipe: the policy of one job. Every command, flag, column and document shape comes from
the command line in front of you — `traj schema …` read as the `traj` Skill says — and never from this
file. When the schema does not publish something this Recipe needs, stop and say so rather than fill
the gap.

The job: one statement becomes ledger rows once, correctly, and the person is shown a proof.

## Before the first row

Collect these, and ask for whichever is missing:

- the export file itself, and the statement's start date, end date and closing balance as the bank
  printed them;
- the account in the chart the statement belongs to, read from `traj account list --json`;
- the opening equity account an opening balance posts against.

This release of `traj` is THB only. A statement in another currency is a stop, not a conversion.

## Step 1: read the bank's header

The first line of the export is that bank's header, and it is the bank's, not the template's. Read it
before you map anything: which column carries the date, which the memo, which the amount, and whether
the bank supplies its own transaction id. A bank that splits its money into a debit column and a
credit column has that shape; a bank that prints one signed column has another. Neither is universal,
and neither is the template.

The template this release imports is what `traj tx import --template` prints. Read it, and map the
export into that shape instead of restating the shape here.

## Step 2: choose the signed-amount mapping, and confirm it once

The bank's amount carries a sign, or two columns that stand for one. Turn it into the ledger's
direction with one stated rule: money leaving the statement's account goes from that account, money
arriving goes to it. The template's amount column is a magnitude, because the two account columns
carry the direction; the bank's sign is what decides which way the row points, and it is what the
external reference keeps.

Show one real statement row worked through — date, signed amount, both accounts, memo — and confirm
that mapping once. Unattended, state the mapping you chose in the report, with the same worked row,
instead of asking.

## Step 3: chart every counterparty

Every distinct counterparty or memo in the statement must land on an account that already exists.
Read `traj account list --json` and match against it; a counterparty with no account is a question,
not a guess, and creating one needs the person's word. One counterparty, one account. A transfer
between the person's own accounts is not spending.

## Step 4: date the opening balance where the statement starts

The statement's opening balance is a row of its own, dated on the statement's start date — never
today, and never the first transaction's date. It posts against the opening equity account, and it is
what makes the statement's own period reconcile from its first day.

## Step 5: derive the external reference from bank-side data

Every row carries an external reference before the file is written, and it is chosen from the bank's
own data:

- the bank's transaction id when the export supplies one, exactly as printed;
- otherwise the date, the signed amount and the normalised memo, joined by hyphens, with a 1-based
  occurrence index appended for twins — `…-1`, `…-2` — in statement order.

Normalise the memo by trimming it, collapsing internal whitespace and case-folding; keep the amount
as the signed decimal exactly as imported.

Never use the row number, the line number or a counter of your own: a re-sorted export must produce
the same references for the same rows. Two rows that differ only in the memo's case are twins and get
indexes, not one deduplicated row.

The scheme is fixed once the person's ledger holds imported rows: a change re-imports an old
statement as new rows, so a change to it is a migration note in this Recipe, never a silent edit.

## Step 6: write the file, dry-run it, then import

Write the rows into the template's columns in the template's order, with one header line. Run the dry
run first and show the person what it reports: the counts, the first and last date, every row it
calls `rejected`, and every row it calls `duplicate`.

Only then import. Stop when a first import reports any `duplicate` row: on a ledger that holds no
imported rows a duplicate is a collision, and importing the rest would hide it. Fix the references
and dry-run again. On a re-import of the same statement duplicates are the scheme working: report
nothing to do and import nothing.

## Step 7: prove it

Two figures, both shown to the person:

- the trial balance at the statement's end date balances — debits equal credits — from
  `traj balance --as-of <end> --trial-balance --json`;
- the statement's account reads the statement's closing balance, to the satang, at that same end
  date.

A difference is a missing row, a doubled row or a wrong direction; find it before you say the import
is done.

## Step 8: the undo is a void

`traj tx void <id> --date <date> --json` reverses a wrong row and keeps both rows. Never delete a row,
never edit the imported file in place, and never re-import to correct one. Say which rows you voided
and why.

## Unattended

State what you chose and the row that shows it: the signed-amount mapping, the charting, and the
opening balance's date. Ask nothing. Stop at the first thing that would need a guess — an uncharted
counterparty, a missing closing balance, a currency that is not THB — and say what is missing.

## What this Recipe never does

- It never invents a column, a flag or a document shape, and never restates the template from memory.
- It never writes the same statement twice, and never calls a duplicate a success on a first import.
- It never reports the import as done before both proof figures agree.
