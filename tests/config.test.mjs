import test from "node:test"
import assert from "node:assert/strict"
import { configuration } from "../scripts/config.mjs"
test("local defaults and explicit HTTPS origins keep network boundaries clear", () => {
  assert.equal(configuration({}).host, "127.0.0.1")
  assert.equal(configuration({}).origin, "http://localhost:3210")
  assert.throws(
    () => configuration({ APP_ORIGIN: "http://example.com" }),
    /HTTPS/
  )
  assert.throws(
    () => configuration({ APP_ORIGIN: "https://example.com/path" }),
    /without a path/
  )
  assert.throws(() => configuration({ PORT: "no" }), /PORT/)
  assert.throws(() => configuration({ VNC_PORT: "-1" }), /VNC_PORT/)
  assert.equal(
    configuration({ APP_ORIGIN: "https://lab.example.com" }).origin,
    "https://lab.example.com"
  )
})
