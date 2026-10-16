import { spawn } from "node:child_process"
import { loadEnvironment, configuration, root } from "./config.mjs"
loadEnvironment()
configuration()
const child = spawn(process.execPath, ["packages/web/server/index.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: process.argv[2] === "dev" ? "development" : "production",
  },
})
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal))
child.on("error", (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on("exit", (code) => {
  process.exitCode = code ?? 1
})
