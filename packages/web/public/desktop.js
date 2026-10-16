import RFB from "/novnc/core/rfb.js"
const settings = fetch("/api/status").then((r) => r.json())
let rfb
let connected = false
const $ = (id) => document.getElementById(id)
const status = (text) => {
  $("status").textContent = text
}
$("connect").onclick = async () => {
  const cfg = await settings
  if (!cfg.authenticated) {
    status("Pair this browser from the chat page first.")
    return
  }
  if (cfg.desktopPlatform === "linux") {
    modifiers.Meta = [0xffeb, "MetaLeft"]
    modifiers.Command = modifiers.Meta
    modifiers.Alt = [0xffe9, "AltLeft"]
  }
  rfb?.disconnect()
  rfb = new RFB(
    $("screen"),
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/vnc`
  )
  rfb.scaleViewport = true
  rfb.resizeSession = false
  rfb.viewOnly = false
  status("Connecting…")
  rfb.addEventListener("connect", () => {
    connected = true
    status("Connected · live desktop")
    $("disconnect").disabled = false
    $("connect").disabled = true
    rfb.focus()
  })
  rfb.addEventListener("disconnect", (event) => {
    connected = false
    status(event.detail.clean ? "Disconnected" : "Connection ended")
    $("disconnect").disabled = true
    $("connect").disabled = false
  })
  rfb.addEventListener("credentialsrequired", () => {
    $("credentials").showModal()
  })
  rfb.addEventListener("securityfailure", (e) =>
    status(`Authentication failed: ${e.detail.reason || "rejected"}`)
  )
}
$("credentials").querySelector("form").onsubmit = (event) => {
  event.preventDefault()
  rfb.sendCredentials({
    username: $("username").value,
    password: $("password").value,
  })
  $("password").value = ""
  $("credentials").close()
  rfb.focus()
}
$("disconnect").onclick = () => rfb?.disconnect()

// Public tab-level input adapter. All input still travels through this noVNC
// connection; no native desktop APIs or additional host agents are involved.
// These modifier keysyms match noVNC's macOS keyboard mapping.
const modifiers = {
  Meta: [0xffe9, "MetaLeft"],
  Command: [0xffe9, "MetaLeft"],
  Alt: [0xff7e, "AltLeft"],
  Control: [0xffe3, "ControlLeft"],
  Ctrl: [0xffe3, "ControlLeft"],
  Shift: [0xffe1, "ShiftLeft"],
}
const special = {
  Enter: [0xff0d, "Enter"],
  Tab: [0xff09, "Tab"],
  Escape: [0xff1b, "Escape"],
  Backspace: [0xff08, "Backspace"],
  Delete: [0xffff, "Delete"],
  ArrowLeft: [0xff51, "ArrowLeft"],
  ArrowUp: [0xff52, "ArrowUp"],
  ArrowRight: [0xff53, "ArrowRight"],
  ArrowDown: [0xff54, "ArrowDown"],
  space: [32, "Space"],
}
function character(char) {
  if (char === "\n") return special.Enter
  const point = char.codePointAt(0)
  return [
    point > 255 ? 0x01000000 | point : point,
    /[a-z]/i.test(char)
      ? `Key${char.toUpperCase()}`
      : /[0-9]/.test(char)
        ? `Digit${char}`
        : "Unidentified",
  ]
}

function surface() {
  if (!connected) throw new Error("The desktop VNC session is disconnected.")
  const canvas = $("screen").querySelector("canvas")
  if (!canvas?.width || !canvas.height)
    throw new Error("The desktop image is not ready.")
  return canvas
}

function pointer(command) {
  const canvas = surface()
  const rect = canvas.getBoundingClientRect()
  const x =
    command.x ?? (command.action === "scroll" ? canvas.width / 2 : undefined)
  const y =
    command.y ?? (command.action === "scroll" ? canvas.height / 2 : undefined)
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    y < 0 ||
    x >= canvas.width ||
    y >= canvas.height
  ) {
    throw new Error(
      "Pointer coordinates must be inside the observed desktop image."
    )
  }
  if (!rect.width || !rect.height)
    throw new Error("The desktop canvas has no layout.")
  // noVNC scales these browser coordinates back to the remote image pixels.
  const event = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect.left + (x * rect.width) / canvas.width,
    clientY: rect.top + (y * rect.height) / canvas.height,
  }
  if (command.action === "click") {
    canvas.dispatchEvent(
      new MouseEvent("mousedown", { ...event, button: 0, buttons: 1 })
    )
    // noVNC captures mouseup on window after a press, then releases capture.
    window.dispatchEvent(
      new MouseEvent("mouseup", { ...event, button: 0, buttons: 0 })
    )
  } else {
    const deltaY = command.deltaY ?? 500
    if (!Number.isFinite(deltaY))
      throw new Error("Scroll distance must be a number.")
    canvas.dispatchEvent(
      new WheelEvent("wheel", {
        ...event,
        deltaX: 0,
        deltaY,
        deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      })
    )
  }
}

window.browserLabDesktop = {
  observe() {
    const desktop = {
      connected,
      status: $("status").textContent,
      visibility: document.visibilityState,
    }
    if (!connected) return { desktop }
    const canvas = surface()
    return {
      desktop: { ...desktop, width: canvas.width, height: canvas.height },
      // Read the live RFB backbuffer, independent of painting the hidden tab.
      screenshot: rfb.toDataURL("image/jpeg", 0.8).split(",")[1],
      screenshotCoordinates: "remote desktop pixels",
    }
  },
  input(command) {
    surface()
    if (command.action === "click" || command.action === "scroll") {
      pointer(command)
    } else if (command.action === "text") {
      if (typeof command.text !== "string") throw new Error("Text is required.")
      for (const char of command.text) rfb.sendKey(...character(char))
    } else if (command.action === "key") {
      if (typeof command.key !== "string") throw new Error("Key is required.")
      const parts = command.key.split("+")
      const key = parts.pop()
      const held = parts.map((part) => {
        if (!modifiers[part]) throw new Error(`Unknown modifier ${part}`)
        return modifiers[part]
      })
      const main = special[key] || (key.length === 1 ? character(key) : null)
      if (!main) throw new Error(`Unknown key ${key}`)
      try {
        for (const [symbol, code] of held) rfb.sendKey(symbol, code, true)
        rfb.sendKey(...main)
      } finally {
        for (const [symbol, code] of held.reverse())
          rfb.sendKey(symbol, code, false)
      }
    } else throw new Error("Unsupported VNC action.")
    return {
      connected: true,
      action: command.action,
      visibility: document.visibilityState,
    }
  },
}
