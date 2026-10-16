# Chrome extension

`bridge.js` relays messages from the configured application origin to `worker.js`. The worker implements tab tools with Chrome's debugger protocol and the noVNC tab adapter. It validates the message sender's origin and refuses to target its own controlling chat tab.

Run `npm run configure` from the root, then load the generated **`dist/extension`** directory through Chrome's **Load unpacked** UI. Do not load this source directory: its scripts intentionally contain an unresolved origin marker. Reload the extension and chat after configuration changes.

Permissions are `debugger` and `tabs`; no model key or pairing secret belongs in the extension. Read [security boundaries](../../SECURITY.md) before installing into a profile. [Architecture](../../docs/architecture.md) defines messages, coordinates, side effects, and failure behavior. Root `npm run test:browser` exercises the real extension in isolated Chromium. Both packages share the root [changelog](../../CHANGELOG.md).
