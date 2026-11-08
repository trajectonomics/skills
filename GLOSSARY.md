# Domain Glossary: @trajectonomics/skills

Ubiquitous language for `trajectonomics/skills`. Every term defined here is binding across code, tests, documentation, and PR titles. Synonyms in a diff are defects.

## Core Terms

### Skill
A packaged set of agent instructions, defined by a `SKILL.md`, that an agent loads for a particular kind of task.

### Skill Pin
An entry in `skills-lock.json` recording a skill's source and content hash so installs are reproducible.

### Invariant
A rule or condition that must hold true across all state transitions in this system.
