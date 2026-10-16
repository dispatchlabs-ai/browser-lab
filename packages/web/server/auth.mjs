import { randomBytes, createHash } from "node:crypto"
import { mkdir, chmod, writeFile } from "node:fs/promises"
import { DatabaseSync } from "node:sqlite"
import { join } from "node:path"

const digest = (value) => createHash("sha256").update(value).digest("hex")
export const cookieName = "browser_lab_session"
export class PairingAuth {
  constructor(state, { now = Date.now } = {}) {
    this.directory = state
    this.databasePath = join(state, "authorization.sqlite")
    this.now = now
  }
  async prepare() {
    if (!this.preparing)
      this.preparing = (async () => {
        await mkdir(this.directory, { recursive: true, mode: 0o700 })
        await chmod(this.directory, 0o700)
        try {
          await writeFile(this.databasePath, "", { flag: "wx", mode: 0o600 })
        } catch (error) {
          if (error.code !== "EEXIST") throw error
        }
        await chmod(this.databasePath, 0o600)
        this.db = new DatabaseSync(this.databasePath)
        this.db.exec(
          "PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS tokens (hash TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('pair','session')), expires_at INTEGER NOT NULL)"
        )
      })()
    await this.preparing
  }
  insert(kind, lifetime) {
    const token = randomBytes(32).toString("hex")
    const expiresAt = this.now() + lifetime
    this.db
      .prepare("INSERT INTO tokens VALUES (?, ?, ?)")
      .run(digest(token), kind, expiresAt)
    return { token, expiresAt }
  }
  async issuePair() {
    await this.prepare()
    this.db.prepare("DELETE FROM tokens WHERE expires_at <= ?").run(this.now())
    return this.insert("pair", 10 * 60_000)
  }
  async valid(kind, token) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return false
    await this.prepare()
    return Boolean(
      this.db
        .prepare(
          "SELECT 1 FROM tokens WHERE hash=? AND kind=? AND expires_at>?"
        )
        .get(digest(token), kind, this.now())
    )
  }
  async redeem(token) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null
    await this.prepare()
    // Redemption and session creation are atomic across server and admin processes.
    this.db.exec("BEGIN IMMEDIATE")
    try {
      const consumed = this.db
        .prepare(
          "DELETE FROM tokens WHERE hash=? AND kind='pair' AND expires_at>? RETURNING hash"
        )
        .get(digest(token), this.now())
      const session = consumed ? this.insert("session", 24 * 60 * 60_000) : null
      this.db.exec("COMMIT")
      return session
    } catch (error) {
      this.db.exec("ROLLBACK")
      throw error
    }
  }
  token(req) {
    const matches = (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .filter((x) => x.startsWith(`${cookieName}=`))
    return matches.length === 1 ? matches[0].slice(cookieName.length + 1) : ""
  }
  async authorized(req) {
    const token = this.token(req)
    return (await this.valid("session", token)) ? token : null
  }
  async revoke(token) {
    await this.prepare()
    this.db
      .prepare("DELETE FROM tokens WHERE hash=? AND kind='session'")
      .run(digest(token))
  }
  async revokeAll() {
    await this.prepare()
    this.db.exec("DELETE FROM tokens")
  }
  cookie(token, secure, clear = false) {
    return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 86400}${secure ? "; Secure" : ""}`
  }
  close() {
    this.db?.close()
  }
}
