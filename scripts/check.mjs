import { readdir } from "node:fs/promises"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { root } from "./config.mjs"
for (const directory of [
  "scripts",
  "packages/web/server",
  "packages/extension",
  "packages/web/public",
  "tests",
]) {
  for (const name of await readdir(join(root, directory))) {
    if (!/\.(mjs|js)$/.test(name)) continue
    const result = spawnSync(
      process.execPath,
      ["--check", join(root, directory, name)],
      { stdio: "inherit" }
    )
    if (result.status !== 0) process.exit(result.status || 1)
  }
}
