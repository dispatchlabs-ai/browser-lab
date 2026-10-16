"use client"
import * as React from "react"

export function PairingGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = React.useState<boolean | null>(null)
  const [token, setToken] = React.useState("")
  const [error, setError] = React.useState("")
  const initialization = React.useRef<Promise<boolean> | null>(null)
  React.useEffect(() => {
    let active = true
    if (!initialization.current)
      initialization.current = (async () => {
        const fragment = new URLSearchParams(location.hash.slice(1))
        const pair = fragment.get("pair")
        if (pair) {
          history.replaceState(null, "", location.pathname + location.search)
          const response = await fetch("/api/auth/pair", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: pair }),
          })
          if (!response.ok)
            throw new Error(
              "This pairing link has expired or was already used. Generate another with npm run pair."
            )
        }
        return Boolean(
          (await (await fetch("/api/status")).json()).authenticated
        )
      })()
    initialization.current.then(
      (value) => {
        if (active) setAuthenticated(value)
      },
      (e) => {
        if (active) {
          setError(e.message)
          setAuthenticated(false)
        }
      }
    )
    return () => {
      active = false
    }
  }, [])
  if (authenticated)
    return (
      <>
        <div className="flex justify-end border-b px-6 py-1">
          <button
            className="text-xs text-muted-foreground underline"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" })
              location.reload()
            }}
          >
            Disconnect this browser
          </button>
        </div>
        {children}
      </>
    )
  if (authenticated === null)
    return <p className="m-auto p-6">Checking browser pairing…</p>
  return (
    <main className="m-auto w-full max-w-lg space-y-5 p-8">
      <h1 className="text-2xl font-semibold">Pair this browser</h1>
      <p>
        Run <code>npm run pair</code> in your Browser Lab checkout and open the
        private link in this Chrome profile, or paste its code below.
      </p>
      <p className="text-sm text-muted-foreground">
        Once paired, your agent can control tabs through the extension.
        Screenshots and page content go to your selected model provider. Desktop
        control also requires your own VNC connection.
      </p>
      <form
        className="flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault()
          setError("")
          let value = token.trim()
          try {
            if (value.startsWith("http"))
              value =
                new URLSearchParams(new URL(value).hash.slice(1)).get("pair") ||
                ""
          } catch {
            setError("Enter the pairing code or complete private link.")
            return
          }
          setToken("")
          try {
            const response = await fetch("/api/auth/pair", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ token: value }),
            })
            if (!response.ok)
              throw new Error(
                "Pairing code expired or already used. Generate another with npm run pair."
              )
            setAuthenticated(true)
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
          }
        }}
      >
        <input
          type="password"
          autoComplete="off"
          aria-label="Pairing code"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="min-w-0 flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-primary-foreground"
        >
          Pair
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </main>
  )
}
