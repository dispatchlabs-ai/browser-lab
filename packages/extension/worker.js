const ORIGIN = "__BROWSER_LAB_ORIGIN__"
const attached = new Set()
chrome.debugger.onDetach.addListener((source) => attached.delete(source.tabId))
async function cdp(tabId, method, params = {}) {
  if (!attached.has(tabId)) {
    await chrome.debugger.attach({ tabId }, "1.3")
    attached.add(tabId)
  }
  return chrome.debugger.sendCommand({ tabId }, method, params)
}
const observe = `(() => {
  const bounds = e => {const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}};
  const frame = document.querySelector('iframe[title="Remote desktop"]');
  let desktop;
  if (frame) { const r = frame.getBoundingClientRect(); const doc = frame.contentDocument; const canvas = doc?.querySelector('canvas');
    desktop = {status:doc?.getElementById('status')?.textContent,canvas:canvas?{...bounds(canvas),x:Math.round(r.x+canvas.getBoundingClientRect().x),y:Math.round(r.y+canvas.getBoundingClientRect().y)}:null}; }
  return {url:location.href,title:document.title,desktop,viewport:{width:innerWidth,height:innerHeight,devicePixelRatio,scrollX,scrollY},
    text:document.body.innerText.slice(0,20000),elements:[...document.querySelectorAll('a,button,input,textarea,select,[role="button"],canvas')]
    .filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.y<innerHeight})
    .slice(0,120).map(e=>({tag:e.tagName,role:e.getAttribute('role'),label:e.getAttribute('aria-label')||e.innerText?.slice(0,100)||e.getAttribute('placeholder')||'',...bounds(e)}))};
})()`
const keys = {
  Enter: ["Enter", 13],
  Tab: ["Tab", 9],
  Escape: ["Escape", 27],
  Backspace: ["Backspace", 8],
  Delete: ["Delete", 46],
  space: ["Space", 32],
  ArrowUp: ["ArrowUp", 38],
  ArrowDown: ["ArrowDown", 40],
  ArrowLeft: ["ArrowLeft", 37],
  ArrowRight: ["ArrowRight", 39],
}
async function key(tabId, value) {
  const parts = value.split("+")
  let name = parts.pop()
  let modifiers = 0
  const held = []
  for (const part of parts) {
    const spec = {
      Alt: [1, "Alt", "AltLeft", 18],
      Control: [2, "Control", "ControlLeft", 17],
      Ctrl: [2, "Control", "ControlLeft", 17],
      Meta: [4, "Meta", "MetaLeft", 91],
      Command: [4, "Meta", "MetaLeft", 91],
      Shift: [8, "Shift", "ShiftLeft", 16],
    }[part]
    if (!spec) throw new Error(`Unknown modifier ${part}`)
    modifiers |= spec[0]
    held.push(spec)
    await cdp(tabId, "Input.dispatchKeyEvent", {
      type: "keyDown",
      key: spec[1],
      code: spec[2],
      windowsVirtualKeyCode: spec[3],
      modifiers,
    })
  }
  const [code, vk] = keys[name] || [
    name.length === 1
      ? /[0-9]/.test(name)
        ? `Digit${name}`
        : `Key${name.toUpperCase()}`
      : name,
    name.toUpperCase().charCodeAt(0),
  ]
  const keyName = name === "space" ? " " : name
  await cdp(tabId, "Input.dispatchKeyEvent", {
    type: "keyDown",
    key: keyName,
    code,
    windowsVirtualKeyCode: vk,
    modifiers,
    ...(!modifiers && keyName.length === 1 ? { text: keyName } : {}),
  })
  await cdp(tabId, "Input.dispatchKeyEvent", {
    type: "keyUp",
    key: keyName,
    code,
    windowsVirtualKeyCode: vk,
    modifiers,
  })
  for (const spec of held.reverse()) {
    modifiers &= ~spec[0]
    await cdp(tabId, "Input.dispatchKeyEvent", {
      type: "keyUp",
      key: spec[1],
      code: spec[2],
      windowsVirtualKeyCode: spec[3],
      modifiers,
    })
  }
}
async function execute(command, sender) {
  if (command.name === "ping")
    return {
      extension: "Browser Lab",
      version: chrome.runtime.getManifest().version,
    }
  if (command.name === "browser_tabs")
    return {
      tabs: (await chrome.tabs.query({})).map((t) => ({
        id: t.id,
        title: t.title,
        url: t.url,
        active: t.active,
        chat: t.id === sender.tab.id,
      })),
    }
  if (command.name === "browser_navigate") {
    const url = new URL(command.url)
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Only http/https navigation is supported.")
    if (command.tabId === sender.tab.id)
      throw new Error("Keep the controlling chat tab open.")
    const tab = command.tabId
      ? await chrome.tabs.update(command.tabId, { url: url.href, active: true })
      : await chrome.tabs.create({ url: url.href, active: true })
    return { tabId: tab.id, url: tab.url, pendingUrl: tab.pendingUrl }
  }
  if (!Number.isInteger(command.tabId) || command.tabId === sender.tab.id)
    throw new Error("Choose a target tab other than this controlling chat.")
  const tab = await chrome.tabs.get(command.tabId)
  if (!/^https?:/.test(tab.url || ""))
    throw new Error("This browser page cannot be automated.")
  const target = new URL(tab.url)
  const desktop =
    target.origin === ORIGIN &&
    ["/desktop", "/desktop.html"].includes(target.pathname)
  if (desktop && ["browser_observe", "browser_input"].includes(command.name)) {
    // The viewer must stay off the captured desktop to avoid a feedback loop.
    // Selecting the chat tab does not bring Chrome in front of native apps.
    if (tab.active) await chrome.tabs.update(sender.tab.id, { active: true })
    const action =
      command.name === "browser_observe"
        ? "observe()"
        : `input(${JSON.stringify(command)})`
    const result = await cdp(tab.id, "Runtime.evaluate", {
      expression: `(() => {
        const client = window.browserLabDesktop || document.querySelector('iframe[title="Remote desktop"]')?.contentWindow.browserLabDesktop;
        if (!client?.observe) throw new Error('Reload the desktop tab to enable background control.');
        return client.${action};
      })()`,
      returnByValue: true,
    })
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ||
          "Desktop action failed"
      )
    return {
      ok: true,
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
      tabActive: (await chrome.tabs.get(tab.id)).active,
      transport: "Chrome background tab → noVNC → RFB",
      ...result.result.value,
    }
  }
  if (command.name === "browser_observe") {
    const observed = await cdp(tab.id, "Runtime.evaluate", {
      expression: observe,
      returnByValue: true,
    })
    if (observed.exceptionDetails)
      throw new Error("The page is not ready to observe.")
    const viewport = observed.result.value.viewport
    const screenshot = await cdp(tab.id, "Page.captureScreenshot", {
      format: "jpeg",
      quality: 80,
      captureBeyondViewport: false,
      clip: {
        x: viewport.scrollX,
        y: viewport.scrollY,
        width: viewport.width,
        height: viewport.height,
        scale: 1 / viewport.devicePixelRatio,
      },
    })
    return {
      ...observed.result.value,
      screenshot: screenshot.data,
      screenshotCoordinates: "CSS viewport pixels",
    }
  }
  if (command.name !== "browser_input") throw new Error("Unknown command")
  await chrome.tabs.update(tab.id, { active: true })
  if (command.action === "click") {
    if (!Number.isFinite(command.x) || !Number.isFinite(command.y))
      throw new Error("click requires x and y")
    await cdp(tab.id, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: command.x,
      y: command.y,
      button: "left",
      clickCount: 1,
    })
    await cdp(tab.id, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: command.x,
      y: command.y,
      button: "left",
      clickCount: 1,
    })
  } else if (command.action === "text") {
    if (typeof command.text !== "string") throw new Error("text is required")
    await cdp(tab.id, "Input.insertText", { text: command.text })
  } else if (command.action === "key") await key(tab.id, command.key)
  else if (command.action === "scroll")
    await cdp(tab.id, "Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: command.x ?? 300,
      y: command.y ?? 300,
      deltaX: 0,
      deltaY: command.deltaY ?? 500,
    })
  else throw new Error("Unknown input action")
  return { ok: true, action: command.action, tabId: tab.id }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (
    !sender.tab ||
    sender.frameId !== 0 ||
    new URL(sender.url).origin !== ORIGIN
  ) {
    respond({ error: "Untrusted caller" })
    return
  }
  execute(message.command, sender).then(
    (result) => respond({ result }),
    (error) => respond({ error: error.message })
  )
  return true
})
