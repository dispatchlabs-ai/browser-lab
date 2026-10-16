import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { resolve, join } from "node:path"
import { fileURLToPath } from "node:url"

export const root = fileURLToPath(new URL("../", import.meta.url))
export const webRoot = join(root, "packages/web")
export function loadEnvironment() {
  const path = join(root, ".env")
  if (existsSync(path)) process.loadEnvFile(path)
}
export function configuration(env = process.env) {
  const port = Number(env.PORT || 3210)
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("PORT must be an integer between 1024 and 65535.")
  const url = new URL(env.APP_ORIGIN || `http://localhost:${port}`)
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "APP_ORIGIN must be an origin without a path, credentials, query or fragment."
    )
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  )
    throw new Error("Remote APP_ORIGIN requires HTTPS.")
  const state = resolve(
    env.STATE_DIR || join(homedir(), ".local/share/browser-lab")
  )
  const vncPort = Number(env.VNC_PORT || 5900)
  if (!Number.isInteger(vncPort) || vncPort < 1 || vncPort > 65535)
    throw new Error("VNC_PORT is invalid.")
  const desktopPlatform = env.DESKTOP_PLATFORM || "mac"
  if (!["mac", "linux"].includes(desktopPlatform))
    throw new Error("DESKTOP_PLATFORM must be mac or linux.")
  return {
    port,
    origin: url.origin,
    host: "127.0.0.1",
    state,
    authPath: resolve(env.PI_AUTH || join(state, "provider-auth.json")),
    model: {
      provider: env.MODEL_PROVIDER || "openai",
      modelId: env.MODEL_ID || "gpt-5.4",
    },
    thinkingLevel: env.THINKING_LEVEL || "medium",
    vncHost: env.VNC_HOST || "",
    vncPort,
    desktopPlatform,
  }
}
