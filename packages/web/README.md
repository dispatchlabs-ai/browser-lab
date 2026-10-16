# Web application and backend

This package owns the Next.js chat, authenticated Pi Durable server, SQLite state, and optional noVNC viewer. Start from the root [quickstart](../../docs/quickstart.md); install dependencies and run commands from the root workspace.

- `app/` and `components/`: UI and pairing gate.
- `server/index.mjs`: HTTP/WebSocket routing and Pi tools.
- `server/auth.mjs`: local enrollment and browser-session authority.
- `server/bridge.mjs`: command/result correlation and uncertain outcomes.
- `public/desktop.*`: noVNC viewer and background input/observation adapter.
- `public/probe.html`: synthetic first-use task.

The custom Node server is required; plain `next start` does not provide the backend. See [architecture and interfaces](../../docs/architecture.md), [OpenAPI](../../docs/openapi.json), and [security](../../SECURITY.md). Root `npm run build`, `check`, `test:browser`, and `demo` cover this package. The root [changelog](../../CHANGELOG.md) versions both packages together.
