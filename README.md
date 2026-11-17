# @trajectonomics/skills

Agent skills for Trajectonomics

[![CI](https://github.com/trajectonomics/skills/actions/workflows/ci.yml/badge.svg)](https://github.com/trajectonomics/skills/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Part of the [Trajectonomics](https://github.com/trajectonomics) ecosystem.

---

## Install

Install the onboarding skill, then let your agent set you up:

```bash
npx skills add trajectonomics/skills --skill traj-onboarding
```

The onboarding skill installs the `traj` command line and then the `traj` operating skill, which
publishes from this repository too. The `skills` CLI version this skill is checked against,
`skills@1.7.6`, needs Node 22.20 or later. The `traj` command line the skill installs needs Node 20 or
later.

---

## Development

`@trajectonomics/skills` is this repository's private npm package: visitors install the skill above,
not this package.

```bash
bun add @trajectonomics/skills
```

```typescript
import { createEntity } from "@trajectonomics/skills"

const entity = createEntity({ id: "1", label: "Example" })
console.log(entity)
```

Working in this repository:

```bash
# Install dependencies
bun install

# Run full verification suite (lint, typecheck, tests, build)
bun run check

# Run tests
bun test

# Code formatting & lint
bun run format
bun run lint
```

---

## Domain Documentation

- [GLOSSARY.md](./GLOSSARY.md): Ubiquitous domain terminology.
- [AGENTS.md](./AGENTS.md): Guidelines and rules for autonomous AI coding agents.
- [CODING_STANDARDS.md](./CODING_STANDARDS.md): Architecture, purity, and review invariants.
- [docs/adr/](./docs/adr/): Architecture Decision Records.

---

## License

[MIT](./LICENSE)
