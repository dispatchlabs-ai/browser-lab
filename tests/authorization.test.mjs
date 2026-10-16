import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, rm, stat } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { PairingAuth } from "../packages/web/server/auth.mjs"

test("pair links are one-use, expiring, private, and revocable", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "browser-lab-auth-"))
  t.after(async () => {
    auth.close()
    await rm(dir, { recursive: true, force: true })
  })
  let now = 0
  const auth = new PairingAuth(dir, { now: () => now })
  const link = await auth.issuePair()
  assert.equal((await stat(auth.databasePath)).mode & 0o777, 0o600)
  const attempts = await Promise.all([
    auth.redeem(link.token),
    auth.redeem(link.token),
  ])
  assert.equal(attempts.filter(Boolean).length, 1)
  const session = attempts.find(Boolean)
  const req = { headers: { cookie: `browser_lab_session=${session.token}` } }
  assert.equal(await auth.authorized(req), session.token)
  await auth.revoke(session.token)
  assert.equal(await auth.authorized(req), null)
  const expired = await auth.issuePair()
  now = 11 * 60_000
  assert.equal(await auth.redeem(expired.token), null)
  const second = await auth.redeem((await auth.issuePair()).token)
  now += 25 * 60 * 60_000
  assert.equal(await auth.valid("session", second.token), false)
  assert.equal(await auth.valid("session", "../bad"), false)
})

test("revoke all invalidates sessions and outstanding pairing links", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "browser-lab-revoke-"))
  t.after(async () => {
    auth.close()
    await rm(dir, { recursive: true, force: true })
  })
  const auth = new PairingAuth(dir)
  const session = await auth.redeem((await auth.issuePair()).token)
  const unused = await auth.issuePair()
  await auth.revokeAll()
  assert.equal(await auth.valid("session", session.token), false)
  assert.equal(await auth.redeem(unused.token), null)
  assert.match(auth.cookie("value", true), /HttpOnly; SameSite=Strict.*Secure/)
})
