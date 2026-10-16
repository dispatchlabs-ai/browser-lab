# Contributor guidance

- Read `README.md`, `CONTRIBUTING.md`, and the relevant package README before changing behavior. User setup is in `docs/quickstart.md`.
- Keep the web app in `packages/web` and Chrome integration in `packages/extension`. Preserve the documented bridge contract, pairing, origin checks, and uncertain-action behavior.
- Run `npm run check`, `npm test`, and `npm run build` for code changes. Test the affected real workflow; do not claim browser or desktop qualification from unit checks.
- Keep credentials, pairing links, screenshots, local state, and machine-specific configuration out of Git. Use synthetic examples.
- Keep changes focused and readable. Avoid speculative frameworks, extra services, or new dependencies for small changes.
- Read the installed Next.js documentation in `node_modules/next/dist/docs/` before changing its APIs or configuration.
