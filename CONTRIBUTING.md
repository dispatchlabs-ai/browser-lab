# Contributing

Browser Lab is a small, maintainer-led source alpha. Chris Reynolds is the initial maintainer. Issues and focused pull requests are welcome; contributions are under MIT with no CLA or copyright assignment.

Read the [quickstart](docs/quickstart.md), [architecture](docs/architecture.md), and the relevant package README. Use Node.js 24 or 26 and the root npm workspace. Keep one lockfile. A shared protocol package is unnecessary until an independently useful consumer needs one.

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
npx playwright install --no-shell chromium
npm run test:browser
npm audit --omit=dev --audit-level=high
```

`./scripts/check` runs that same credential-free sequence. Automatic Linux checks run on maintainer-owned infrastructure; this repository has no GitHub Actions. A green check does not establish real-model or native-desktop behavior. Run the affected workflow and record the platform, model, browser, and visible result. `npm run demo` incurs provider usage and is never part of automatic CI.

Keep credentials, pairing links, transcripts, screenshots of private content, and machine inventory out of commits and issue reports. Use the synthetic probe. Report security issues through [SECURITY.md](SECURITY.md). Bug reports should include the commit/tag, OS/Node/browser versions, sanitized diagnostic output, expected behavior, and the observed result.

Prefer small changes that preserve the single-owner boundary and explicit authority. Update the interface documentation when changing tool behavior. Do not add automatic retries to state-changing browser actions: an interrupted result does not prove that an action failed to execute.
