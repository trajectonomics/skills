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

Or paste this to your agent, which runs it for you:

> Install `traj` for me. Run `npx skills add trajectonomics/skills --skill traj-onboarding -y`, then
> read the `traj-onboarding` skill and follow it to set me up. If you cannot run shell commands, say
> so and give me the command above to run myself.

The onboarding skill installs the `traj` command line and then the published skill set, from the one
commit it was installed from. The `skills` CLI version this skill is checked against, `skills@1.9.0`,
needs Node 22.20 or later. The `traj` command line the skill installs needs Node 20 or later.

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
