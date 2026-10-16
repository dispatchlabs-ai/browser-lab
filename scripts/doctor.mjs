import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import { ModelRuntime } from "@earendil-works/pi-coding-agent"
import { loadEnvironment, configuration, root, webRoot } from "./config.mjs"
const checks = []
const add = (code, ok, detail) => checks.push({ code, ok, detail })
try {
  loadEnvironment()
  const config = configuration()
  add("CONFIG", true, config.origin)
  const models = await ModelRuntime.create({
    authPath: config.authPath,
    modelsPath: null,
    refreshOnCreate: false,
  })
  const selected = models.getModel(config.model.provider, config.model.modelId)
  add(
    "VISION_MODEL",
    Boolean(selected?.input.includes("image")),
    `${config.model.provider}/${config.model.modelId}`
  )
  try {
    add(
      "PROVIDER_CREDENTIALS",
      Boolean(
        await models.getAuth(config.model.provider, {
          signal: AbortSignal.timeout(5000),
        })
      ),
      "Credential resolution only; no paid model request is made. An opted-in OAuth login may refresh. See docs/quickstart.md."
    )
  } catch {
    add(
      "PROVIDER_CREDENTIALS",
      false,
      "Could not resolve the selected provider's credential. Check its environment key or opted-in Pi login."
    )
  }
  try {
    const manifest = JSON.parse(
      await readFile(join(root, "dist/extension/manifest.json"), "utf8")
    )
    const workers = await Promise.all(
      ["worker.js", "bridge.js"].map((x) =>
        readFile(join(root, "dist/extension", x), "utf8")
      )
    )
    add(
      "EXTENSION_CONFIG",
      manifest.content_scripts[0].matches[0] === `${config.origin}/*` &&
        workers.every(
          (x) =>
            x.includes(JSON.stringify(config.origin)) ||
            x.includes(`'${config.origin}'`)
        ),
      "Run npm run configure after changing APP_ORIGIN; reload the extension in Chrome."
    )
  } catch {
    add(
      "EXTENSION_CONFIG",
      false,
      "Run npm run configure, then load dist/extension in Chrome."
    )
  }
  try {
    await access(join(webRoot, ".next/BUILD_ID"))
    add("PRODUCTION_BUILD", true, "Production build exists.")
  } catch {
    add(
      "PRODUCTION_BUILD",
      false,
      "Run npm run build before npm start. Development may use npm run dev."
    )
  }
  if (process.argv.includes("--live")) {
    try {
      const response = await fetch(`${config.origin}/healthz`, {
        signal: AbortSignal.timeout(5000),
      })
      const data = await response.json()
      add(
        "SERVER",
        response.ok && data.service === "browser-lab",
        "Server health; pairing and extension execution require the browser smoke workflow."
      )
    } catch {
      add(
        "SERVER",
        false,
        "Server is unreachable at APP_ORIGIN. Start it and check your HTTPS proxy if configured."
      )
    }
  }
} catch (error) {
  add("CONFIG", false, error.message)
}
const report = { ok: checks.every((x) => x.ok), checks }
if (process.argv.includes("--json")) console.log(JSON.stringify(report))
else
  for (const check of checks)
    console.log(`${check.ok ? "PASS" : "FAIL"} ${check.code}: ${check.detail}`)
process.exitCode = report.ok ? 0 : 1
