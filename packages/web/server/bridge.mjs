import { randomUUID } from "node:crypto"

export class BrowserBridge {
  peers = new Map()
  pending = new Map()
  constructor(timeout = 45_000) {
    this.timeout = timeout
  }
  attach(conversationId, ws) {
    this.peers
      .get(conversationId)
      ?.close(1000, "Conversation opened in another tab")
    this.peers.set(conversationId, ws)
    ws.on("message", (bytes) => {
      try {
        const reply = JSON.parse(bytes.toString())
        const call = this.pending.get(reply.id)
        if (reply.type !== "result" || call?.ws !== ws) return
        call.finish(reply.error ? new Error(reply.error) : null, reply.result)
      } catch {
        /* A malformed or unrelated response cannot complete a call. */
      }
    })
    ws.on("close", () => {
      if (this.peers.get(conversationId) === ws)
        this.peers.delete(conversationId)
      for (const call of this.pending.values())
        if (call.ws === ws)
          call.finish(
            new Error(
              "Browser disconnected; action outcome is unknown. Inspect before repeating."
            )
          )
    })
  }
  call(conversationId, command, signal) {
    const ws = this.peers.get(conversationId)
    if (!ws || ws.readyState !== 1)
      throw new Error(
        "Open this conversation in the paired Chrome chat tab first."
      )
    return new Promise((resolve, reject) => {
      const id = randomUUID()
      const finish = (error, value) => {
        clearTimeout(timer)
        signal?.removeEventListener("abort", abort)
        this.pending.delete(id)
        if (error) reject(error)
        else resolve(value)
      }
      const abort = () =>
        finish(
          new Error(
            "Action cancelled; its outcome may be unknown. Inspect before repeating."
          )
        )
      const timer = setTimeout(
        () =>
          finish(
            new Error(
              "Browser timed out; action outcome is unknown. Inspect before repeating."
            )
          ),
        this.timeout
      )
      this.pending.set(id, { ws, finish })
      signal?.addEventListener("abort", abort, { once: true })
      if (signal?.aborted) return abort()
      try {
        ws.send(JSON.stringify({ type: "command", id, command }))
      } catch (error) {
        finish(error)
      }
    })
  }
}
