import { fileURLToPath } from "node:url"

/** The repository root, which every path a script or a test reads is relative to. */
export const repoRoot = fileURLToPath(new URL("..", import.meta.url))
