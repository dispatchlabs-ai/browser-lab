import assert from "node:assert/strict"
import { once } from "node:events"
import { createServer } from "node:net"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn } from "node:child_process"
import { setTimeout as delay } from "node:timers/promises"
import { chromium } from "playwright"
import { WebSocket } from "ws"
import { PairingAuth } from "../packages/web/server/auth.mjs"
import { generateExtension } from "./configure.mjs"
import { loadEnvironment, configuration, root } from "./config.mjs"

loadEnvironment()
const live = process.argv.includes("--live")
const headed = process.argv.includes("--headed")
const config = configuration()
const temporary = await mkdtemp(join(tmpdir(), "browser-lab-"))
const state = join(temporary, "state")
const artifacts = join(root, ".artifacts", live ? "demo" : "browser-check")
await mkdir(artifacts, { recursive: true, mode: 0o700 })
const available = createServer()
await new Promise((resolve) => available.listen(0, "127.0.0.1", resolve))
const port = available.address().port
await new Promise((resolve) => available.close(resolve))
const origin = `http://localhost:${port}`
const extension = await generateExtension(origin, join(temporary, "extension"))
const auth = new PairingAuth(state)
let browser,
  child,
  childExit,
  logs = "",
  failure
const fakeSockets = new Set()
const fakeVnc = createServer((socket) => {
  fakeSockets.add(socket)
  socket.on("close", () => fakeSockets.delete(socket))
  socket.on("error", () => {})
  socket.on("data", (bytes) => socket.write(bytes))
})
await new Promise((resolve) => fakeVnc.listen(0, "127.0.0.1", resolve))

async function until(check, label, timeout = 30_000) {
  const deadline = Date.now() + timeout
  do {
    if (await check()) return
    if (child && (child.exitCode !== null || child.signalCode !== null))
      throw new Error(
        `Server exited while waiting for ${label}: ${logs.slice(-3000)}`
      )
    await delay(150)
  } while (Date.now() < deadline)
  throw new Error(`Timed out waiting for ${label}`)
}

async function accessChecks() {
  const request = (path, body, cookie, requestOrigin = origin) =>
    fetch(`${origin}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: requestOrigin,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    })
  assert.equal((await request("/api/lab/session", {})).status, 401)
  const pair = await auth.issuePair()
  assert.equal(
    (
      await request(
        "/api/auth/pair",
        { token: pair.token },
        undefined,
        "https://example.org"
      )
    ).status,
    403
  )
  const redeemed = await request("/api/auth/pair", { token: pair.token })
  assert.equal(redeemed.status, 200)
  const cookie = redeemed.headers.get("set-cookie").split(";")[0]
  assert.equal(
    (await request("/api/auth/pair", { token: pair.token })).status,
    401
  )
  assert.equal(
    (await request("/api/lab/session", {}, cookie, "https://example.org"))
      .status,
    403
  )
  const session = await (await request("/api/lab/session", {}, cookie)).json()
  const wsUrl = origin.replace("http:", "ws:")
  const open = (path) => {
    const ws = new WebSocket(`${wsUrl}${path}`, { origin, headers: { cookie } })
    ws.on("error", () => {})
    return ws
  }
  const bridge = open(`/bridge?conversation=${session.conversationId}`)
  const vnc = open("/vnc")
  await Promise.all([once(bridge, "open"), once(vnc, "open")])
  const echo = once(vnc, "message")
  vnc.send("synthetic VNC transport check")
  assert.equal((await echo)[0].toString(), "synthetic VNC transport check")
  const closed = Promise.all([once(bridge, "close"), once(vnc, "close")])
  assert.equal((await request("/api/auth/logout", {}, cookie)).status, 200)
  await Promise.race([
    closed,
    delay(2500).then(() => {
      throw new Error("Revoked sockets remained open")
    }),
  ])
  assert.equal((await request("/api/lab/session", {}, cookie)).status, 401)
  await until(
    () => fakeSockets.size === 0,
    "revoked VNC TCP connection to close"
  )
  console.log(
    "PASS authorization, origin rejection, one-use pairing, live bridge/VNC revocation"
  )
}

try {
  child = spawn(process.execPath, ["packages/web/server/index.mjs"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      APP_ORIGIN: origin,
      STATE_DIR: state,
      PI_AUTH: live ? config.authPath : join(state, "provider-auth.json"),
      MODEL_PROVIDER: live ? config.model.provider : "openai",
      MODEL_ID: live ? config.model.modelId : "gpt-5.4",
      VNC_HOST: "127.0.0.1",
      VNC_PORT: String(fakeVnc.address().port),
    },
  })
  childExit = new Promise((resolve) => {
    child.once("exit", resolve)
    child.once("error", (error) => {
      logs += error.message
      resolve()
    })
  })
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (bytes) => {
      logs = (logs + bytes).slice(-12000)
    })
  await until(async () => {
    try {
      return (await fetch(`${origin}/healthz`)).ok
    } catch {
      return false
    }
  }, "production server")
  await accessChecks()
  browser = await chromium.launchPersistentContext(join(temporary, "profile"), {
    channel: "chromium",
    headless: !headed,
    viewport: { width: 1280, height: 850 },
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  })
  const chat = await browser.newPage()
  const pair = await auth.issuePair()
  await chat.goto(`${origin}/#pair=${pair.token}`)
  await chat.getByText("Chrome extension connected").waitFor()
  await chat.getByRole("textbox", { name: "Message", exact: true }).waitFor()
  assert.equal(new URL(chat.url()).hash, "")
  let resultPage
  const message = "Hello from Browser Lab"
  if (live) {
    await chat
      .getByRole("textbox", { name: "Message", exact: true })
      .fill(
        `Open ${origin}/probe.html in a new tab. Inspect it, type exactly "${message}" in its Message input, click Show message, and inspect the result. Report what the output says. Use your browser tools; do not ask me to do the actions.`
      )
    await chat
      .getByRole("button", { name: "Send message", exact: true })
      .click()
    console.log(
      `Running a paid model demo with ${config.model.provider}/${config.model.modelId}…`
    )
    await until(
      async () => {
        resultPage = browser
          .pages()
          .find((page) => page.url() === `${origin}/probe.html`)
        return (
          resultPage &&
          (await resultPage.locator("#result").textContent()) === message
        )
      },
      "the model to complete the browser task",
      300_000
    )
    await until(
      async () =>
        (await chat
          .getByRole("button", { name: "Stop generating" })
          .count()) === 0,
      "the model's final report",
      180_000
    )
    const alerts = (await chat.getByRole("alert").allTextContents()).filter(
      (text) => text.trim()
    )
    assert.deepEqual(alerts, [], `Chat error: ${alerts.join("; ")}`)
  } else {
    const command = (value) =>
      chat.evaluate(
        (command) =>
          new Promise((resolve, reject) => {
            const id = crypto.randomUUID()
            const timer = setTimeout(() => {
              window.removeEventListener("message", receive)
              reject(new Error("Extension command timed out"))
            }, 15_000)
            function receive(event) {
              if (
                event.source !== window ||
                event.origin !== location.origin ||
                event.data?.source !== "browser-lab-extension" ||
                event.data.id !== id
              )
                return
              clearTimeout(timer)
              window.removeEventListener("message", receive)
              if (event.data.error) reject(new Error(event.data.error))
              else resolve(event.data.result)
            }
            window.addEventListener("message", receive)
            window.postMessage(
              { source: "browser-lab-page", id, command },
              location.origin
            )
          }),
        value
      )
    const opened = await command({
      name: "browser_navigate",
      url: `${origin}/probe.html`,
    })
    await until(
      () =>
        browser.pages().find((page) => page.url() === `${origin}/probe.html`),
      "new probe tab"
    )
    resultPage = browser
      .pages()
      .find((page) => page.url() === `${origin}/probe.html`)
    await resultPage.locator("#message").waitFor()
    const observed = await command({
      name: "browser_observe",
      tabId: opened.tabId,
    })
    assert.ok(observed.screenshot.length > 100)
    const field = observed.elements.find((element) => element.tag === "INPUT")
    const button = observed.elements.find((element) => element.tag === "BUTTON")
    for (const action of [
      {
        action: "click",
        x: field.x + field.width / 2,
        y: field.y + field.height / 2,
      },
      { action: "text", text: message },
      {
        action: "click",
        x: button.x + button.width / 2,
        y: button.y + button.height / 2,
      },
    ])
      await command({ name: "browser_input", tabId: opened.tabId, ...action })
    assert.equal(await resultPage.locator("#result").textContent(), message)
    assert.ok(
      (
        await command({ name: "browser_observe", tabId: opened.tabId })
      ).text.includes(message)
    )
  }
  await resultPage.screenshot({ path: join(artifacts, "result.png") })
  await chat.screenshot({ path: join(artifacts, "chat.png") })
  await chat.reload()
  await chat.getByText("Chrome extension connected").waitFor()
  if (live)
    await until(
      async () => (await chat.locator("body").innerText()).includes(message),
      "persisted conversation after reload"
    )
  await chat.getByRole("button", { name: "Disconnect this browser" }).click()
  await chat.getByRole("heading", { name: "Pair this browser" }).waitFor()
  const report = {
    ok: true,
    workflow: live ? "live-model" : "extension-smoke",
    platform: process.platform,
    browser: browser.browser().version(),
    model: live ? config.model : null,
    result: message,
    authChecks: true,
    checkedAt: new Date().toISOString(),
  }
  await writeFile(
    join(artifacts, "result.json"),
    JSON.stringify(report, null, 2) + "\n"
  )
  console.log(JSON.stringify({ ...report, artifacts }))
} catch (error) {
  if (browser) {
    for (const [index, page] of browser.pages().entries()) {
      await page
        .screenshot({ path: join(artifacts, `failure-${index}.png`) })
        .catch(() => {})
      console.error(
        (
          await page
            .locator("body")
            .innerText()
            .catch(() => "")
        ).slice(0, 2000)
      )
    }
    console.error(`Extension workers: ${browser.serviceWorkers().length}`)
  }
  failure = error
} finally {
  await browser?.close().catch(() => {})
  if (child && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGTERM")
    await Promise.race([childExit, delay(3000)])
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL")
      await Promise.race([childExit, delay(1000)])
    }
  }
  for (const socket of fakeSockets) socket.destroy()
  await new Promise((resolve) => fakeVnc.close(resolve))
  auth.close()
  await rm(temporary, { recursive: true, force: true })
}
if (failure) {
  console.error(failure.stack)
  process.exitCode = 1
}
