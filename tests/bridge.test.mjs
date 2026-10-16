import test from "node:test"
import assert from "node:assert/strict"
import { EventEmitter } from "node:events"
import { BrowserBridge } from "../packages/web/server/bridge.mjs"
class Socket extends EventEmitter {
  readyState = 1
  sent = []
  send(data) {
    this.sent.push(JSON.parse(data))
  }
  close() {
    this.readyState = 3
    this.emit("close")
  }
  reply(value) {
    this.emit("message", Buffer.from(JSON.stringify(value)))
  }
}
test("only the issuing socket can settle a pending browser action", async () => {
  const bridge = new BrowserBridge(1000)
  const first = new Socket()
  const other = new Socket()
  bridge.attach(1, first)
  bridge.attach(2, other)
  const action = bridge.call(1, { name: "browser_tabs" })
  const id = first.sent[0].id
  other.reply({ type: "result", id, result: "forged" })
  assert.equal(bridge.pending.size, 1)
  first.reply({ type: "result", id, result: "real" })
  assert.equal(await action, "real")
})
test("disconnect, timeout and cancellation report uncertain outcome without replay", async () => {
  const bridge = new BrowserBridge(10)
  const ws = new Socket()
  bridge.attach(1, ws)
  const disconnected = bridge.call(1, { name: "browser_input" })
  ws.close()
  await assert.rejects(disconnected, /outcome is unknown/)
  const second = new Socket()
  bridge.attach(1, second)
  await assert.rejects(bridge.call(1, { name: "browser_input" }), /timed out/)
  const abort = new AbortController()
  const cancelled = bridge.call(1, { name: "browser_input" }, abort.signal)
  abort.abort()
  await assert.rejects(cancelled, /cancelled/)
  assert.equal(second.sent.length, 2)
  assert.equal(bridge.pending.size, 0)
})
