# Domain Glossary: @trajectonomics/skills

Ubiquitous language for `trajectonomics/skills`. Every term defined here is binding across code, tests, documentation, and PR titles. Synonyms in a diff are defects.

## Core Terms

### Skill
A packaged set of agent instructions, defined by a `SKILL.md`, that an agent loads for a particular kind of task.

### Skill Pin
An entry in `skills-lock.json` recording a skill's source and content hash so installs are reproducible.

### Invariant
A rule or condition that must hold true across all state transitions in this system.

### CLI Version Floor
The oldest `@trajectonomics/cli` release whose command surface the operating Skill's `description` assumes. The onboarding Skill states it once and discloses it when the command line on the machine is older, instead of handing the conversation over silently.

### Ledger File
The SQLite file at `${TRAJ_HOME:-~/.traj}/traj.db`, whose presence means the ledger has been opened on this machine at least once, and never that it holds data: `traj init` and every store-opening command create it empty on the way. The onboarding Skill tests for it and hands the read to the operating Skill.
_Avoid_: database, data directory
