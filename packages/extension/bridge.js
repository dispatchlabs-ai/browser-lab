const ORIGIN = "__BROWSER_LAB_ORIGIN__"
window.addEventListener("message", async (event) => {
  if (
    event.source !== window ||
    event.origin !== ORIGIN ||
    event.data?.source !== "browser-lab-page"
  )
    return
  const { id, command } = event.data
  try {
    const result = await chrome.runtime.sendMessage({ id, command })
    window.postMessage(
      { source: "browser-lab-extension", id, ...result },
      ORIGIN
    )
  } catch (error) {
    window.postMessage(
      { source: "browser-lab-extension", id, error: error.message },
      ORIGIN
    )
  }
})
