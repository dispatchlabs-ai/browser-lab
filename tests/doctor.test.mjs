import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { root } from "../scripts/config.mjs"

test("doctor resolves environment credentials without a model call or exposing the key", async () => {
  const state = await mkdtemp(join(tmpdir(), "browser-lab-doctor-"))
  try {
    for (const key of ["synthetic-browser-lab-key", ""]) {
      const result = spawnSync(
        process.execPath,
        ["scripts/doctor.mjs", "--json"],
        {
          cwd: root,
          encoding: "utf8",
          env: {
            ...process.env,
            STATE_DIR: state,
            PI_AUTH: join(state, "empty.json"),
            MODEL_PROVIDER: "openai",
            MODEL_ID: "gpt-5.4",
            OPENAI_API_KEY: key,
            PORT: "3210",
            APP_ORIGIN: "http://localhost:3210",
            VNC_PORT: "5900",
            DESKTOP_PLATFORM: "mac",
          },
        }
      )
      const report = JSON.parse(result.stdout)
      assert.equal(
        report.checks.find((check) => check.code === "PROVIDER_CREDENTIALS").ok,
        Boolean(key)
      )
      assert.ok(!result.stdout.includes("synthetic-browser-lab-key"))
    }
  } finally {
    await rm(state, { recursive: true, force: true })
  }
})
