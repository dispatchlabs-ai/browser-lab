"use client"
import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ArrowUpIcon, SquareIcon, GlobeIcon, MonitorIcon } from "lucide-react"
import { Message, MessageContent } from "@/components/ui/message"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Button } from "@/components/ui/button"

type Part = { type: string; text?: string; name?: string; arguments?: unknown }
type Entry = {
  id: string
  role: string
  toolName?: string
  isError?: boolean
  content: Part[]
}
type Snapshot = {
  messages: Entry[]
  busy: boolean
  retry?: string
  tools: { name: string; status: string }[]
}
export function Chat() {
  const [view, setView] = React.useState<Snapshot>({
    messages: [],
    busy: false,
    tools: [],
  })
  const [input, setInput] = React.useState("")
  const [error, setError] = React.useState("")
  const [connected, setConnected] = React.useState(false)
  const [extension, setExtension] = React.useState(false)
  const [model, setModel] = React.useState("")
  const [conversation, setConversation] = React.useState("")
  const bottom = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    let socket: WebSocket | undefined
    let stopped = false
    let retry: ReturnType<typeof setTimeout>
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window ||
        event.origin !== location.origin ||
        event.data?.source !== "browser-lab-extension"
      )
        return
      if (event.data.id === "ping") {
        setExtension(Boolean(event.data.result))
        return
      }
      if (socket?.readyState === WebSocket.OPEN)
        socket.send(
          JSON.stringify({
            type: "result",
            id: event.data.id,
            result: event.data.result,
            error: event.data.error,
          })
        )
    }
    window.addEventListener("message", receive)
    const ping = () =>
      window.postMessage(
        { source: "browser-lab-page", id: "ping", command: { name: "ping" } },
        location.origin
      )
    const interval = setInterval(ping, 3000)
    ping()
    async function initialize() {
      const response = await fetch("/api/lab/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: localStorage.getItem("browser-lab-conversation"),
        }),
      })
      const session = await response.json()
      if (!response.ok) throw new Error(session.error)
      if (stopped) return
      localStorage.setItem("browser-lab-conversation", session.conversationId)
      setConversation(session.conversationId)
      setModel(session.model)
      function connect() {
        socket = new WebSocket(
          `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/bridge?conversation=${session.conversationId}`
        )
        socket.onopen = () => {
          setConnected(true)
          setError("")
        }
        socket.onclose = () => {
          setConnected(false)
          if (!stopped) retry = setTimeout(connect, 1500)
        }
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data)
          if (data.type === "snapshot") setView(data)
          else if (data.type === "error") setError(data.error)
          else if (data.type === "command")
            window.postMessage(
              {
                source: "browser-lab-page",
                id: data.id,
                command: data.command,
              },
              location.origin
            )
        }
      }
      connect()
    }
    initialize().catch((e) => setError(e.message))
    return () => {
      stopped = true
      clearTimeout(retry)
      clearInterval(interval)
      window.removeEventListener("message", receive)
      socket?.close()
    }
  }, [])
  React.useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" })
  }, [view.messages.length, view.busy])
  async function action(endpoint: string, extra = {}) {
    try {
      const response = await fetch(`/api/lab/${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: conversation, ...extra }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  function submit(text = input) {
    if (!text.trim() || view.busy || !connected) return
    setInput("")
    setError("")
    void action("input", { text, requestId: crypto.randomUUID() })
  }
  return (
    <div className="mx-auto flex min-h-0 w-full flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <span>
          <span className={connected ? "text-emerald-600" : "text-amber-600"}>
            ●
          </span>{" "}
          {model || "Connecting"} · Pi Durable
        </span>
        <span>
          <span className={extension ? "text-emerald-600" : "text-amber-600"}>
            ●
          </span>{" "}
          {extension
            ? "Chrome extension connected"
            : "Chrome extension not connected"}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {view.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6">
            <Empty>
              <EmptyHeader>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <GlobeIcon className="size-7" />
                </div>
                <EmptyTitle className="text-2xl">
                  A conversation. Another machine.
                </EmptyTitle>
                <EmptyDescription>
                  A Pi Durable agent uses your paired Chrome extension to act in
                  browser tabs and an optional VNC desktop.
                </EmptyDescription>
              </EmptyHeader>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  disabled={!connected || !extension}
                  onClick={() =>
                    submit(
                      "List my browser tabs and tell me which ones you can control."
                    )
                  }
                >
                  <GlobeIcon />
                  Explore browser tabs
                </Button>
                <Button
                  variant="outline"
                  disabled={!connected || !extension}
                  onClick={() =>
                    submit(
                      "Find the desktop tab and inspect it. Tell me what you can see; don't change anything yet."
                    )
                  }
                >
                  <MonitorIcon />
                  Inspect my desktop
                </Button>
              </div>
            </Empty>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
            {view.messages.map((message) => (
              <Message
                key={message.id}
                align={message.role === "user" ? "end" : "start"}
              >
                <MessageContent>
                  {message.role === "toolResult" ? (
                    <details
                      className={`rounded-lg border p-3 text-xs ${message.isError ? "border-red-400" : "text-muted-foreground"}`}
                    >
                      <summary className="cursor-pointer font-medium">
                        {message.isError ? "Action failed" : "Observed"} ·{" "}
                        {message.toolName}
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap">
                        {message.content.map((p) => p.text).join("\n")}
                      </pre>
                    </details>
                  ) : (
                    message.content.map((part, i) =>
                      part.type === "text" && part.text ? (
                        <div
                          key={i}
                          className={
                            message.role === "user"
                              ? "max-w-[90%] rounded-2xl bg-muted px-4 py-3"
                              : "space-y-3 leading-7 [&_a]:underline [&_ol]:list-decimal [&_ul]:list-disc [&_li]:ml-5 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3"
                          }
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            disallowedElements={["img"]}
                            components={{
                              a: ({ children, href }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {part.text}
                          </ReactMarkdown>
                        </div>
                      ) : part.type === "toolCall" ? (
                        <div key={i} className="text-xs text-muted-foreground">
                          ↳ {part.name}{" "}
                          <code>{JSON.stringify(part.arguments)}</code>
                        </div>
                      ) : null
                    )
                  )}
                </MessageContent>
              </Message>
            ))}
            {view.busy && (
              <div
                role="status"
                className="animate-pulse text-sm text-muted-foreground"
              >
                {view.tools.find((t) => t.status === "running")?.name ||
                  "The agent is thinking…"}
              </div>
            )}
            {view.retry && (
              <p className="text-xs text-amber-700">
                Reconnecting to the model: {view.retry}
              </p>
            )}
            <div ref={bottom} />
          </div>
        )}
      </div>
      <div className="mx-auto w-full max-w-3xl px-6 pb-5 pt-3">
        {error && (
          <p role="alert" className="mb-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <InputGroup>
            <InputGroupTextarea
              aria-label="Message"
              placeholder="Ask the agent to do something in Chrome…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault()
                  submit()
                }
              }}
              className="p-3.5"
            />
            <InputGroupAddon align="block-end">
              <span className="text-xs text-muted-foreground">{model}</span>
              {view.busy ? (
                <InputGroupButton
                  type="button"
                  aria-label="Stop generating"
                  size="icon-sm"
                  className="ml-auto"
                  onClick={() => void action("stop")}
                >
                  <SquareIcon />
                </InputGroupButton>
              ) : (
                <InputGroupButton
                  type="submit"
                  aria-label="Send message"
                  size="icon-sm"
                  variant="default"
                  className="ml-auto"
                  disabled={!input.trim() || !connected}
                >
                  <ArrowUpIcon />
                </InputGroupButton>
              )}
            </InputGroupAddon>
          </InputGroup>
        </form>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Source alpha · Screenshots and page content are sent to your model
          provider
        </p>
      </div>
    </div>
  )
}
