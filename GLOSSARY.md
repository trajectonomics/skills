# Domain Glossary: @trajectonomics/skills

Ubiquitous language for `trajectonomics/skills`. Every term defined here is binding across code, tests, documentation, and PR titles. Synonyms in a diff are defects.

## Core Terms

### Skill
A packaged set of agent instructions, defined by a `SKILL.md`, that an agent loads for a particular kind of task.

### Skill Pin
An entry in `skills-lock.json` recording a skill's source and content hash so installs are reproducible.

### Skill Manifest
`skills.manifest.json` at the repository root: the allowlist of the Customer Skills this repository publishes, one row per Skill naming its directory and the CLI Range it expects, in install order. It is the one authored place a range lives — each Skill's frontmatter copy is written from it and checked, and a directory under `skills/` with no row, or a row with no directory, fails `bun run check`.
_Avoid_: skill list, catalogue file

### Recipe
The ordered steps of a multi-step job a workflow Skill carries: what to read first, what to prove, what to stop on. A Recipe names no flag, unit or label that `traj schema` does not publish; the policy is the Skill's, the command surface is the tool's.
_Avoid_: workflow, procedure

### Invariant
A rule or condition that must hold true across all state transitions in this system.

### CLI Range
The npm semver range a published Skill declares it expects of `@trajectonomics/cli`, from the Skill Manifest: copied into the Skill's frontmatter, and stated in the Skill's body where a person reads it. Its lower bound is the CLI Version Floor; its upper bound says when a new CLI minor needs the Skill rechecked. Every published Skill declares `>=0.2.0 <0.3.0` today.
_Avoid_: supported versions, min version

### CLI Version Floor
The oldest `@trajectonomics/cli` release whose command surface a published Skill assumes: the lower bound of that Skill's CLI Range in the [Skill Manifest](#skill-manifest), which is where the number is authored. The onboarding Skill states the floor of the Skill it hands over to and discloses a command line older than it, instead of handing the conversation over silently.

### Ledger File
The SQLite file at `${TRAJ_HOME:-~/.traj}/traj.db`, whose presence means the ledger has been opened on this machine at least once, and never that it holds data: `traj init` and every store-opening command create it empty on the way. The onboarding Skill tests for it and hands the read to the operating Skill.
_Avoid_: database, data directory
