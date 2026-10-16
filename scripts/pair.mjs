import { loadEnvironment, configuration } from "./config.mjs"
import { PairingAuth } from "../packages/web/server/auth.mjs"
loadEnvironment()
const config = configuration()
const auth = new PairingAuth(config.state)
if (process.argv.includes("--revoke")) {
  await auth.revokeAll()
  console.log(
    JSON.stringify({ ok: true, revoked: "all pair links and browser sessions" })
  )
} else {
  const pair = await auth.issuePair()
  const url = `${config.origin}/#pair=${pair.token}`
  if (process.argv.includes("--json"))
    console.log(
      JSON.stringify({ url, expiresAt: new Date(pair.expiresAt).toISOString() })
    )
  else
    console.log(
      `Private, one-use pairing link (expires in 10 minutes):\n${url}\nDo not share it or include it in an agent transcript.`
    )
}

auth.close()
