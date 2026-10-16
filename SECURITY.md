# Security and data boundaries

Browser Lab is an experimental, single-owner control application. Every paired browser has the same owner's authority and access to all stored conversations. There is no user or tenant isolation. Pair only devices you control. Do not offer it as a shared service.

## Browser and desktop authority

The unpacked extension requests `debugger` and `tabs`. It can inspect and modify ordinary HTTP(S) tabs in that Chrome profile. The bridge accepts page messages only from the configured application origin, and the extension verifies the sender's origin. That origin and all JavaScript served from it are trusted control code. Pairing protects the backend APIs, bridge, and VNC proxy; it is not a sandbox against a compromised application origin or another privileged local extension.

The model gets tab titles/URLs, visible text, element bounds, and screenshots when its tools request them. Page content is untrusted. Model instructions tell it to disregard instructions from pages, but prompt injection remains a risk. Use synthetic data and a dedicated browser profile. Actions are real: a click can submit a form, and text can reach the wrong target after a page changes.

The optional VNC connection gives control of the configured desktop. Its endpoint and credentials are supplied by the owner. The model has no shell tool, but desktop access can reach a terminal or other powerful application. This is not a restriction boundary for an authorized desktop session.

## Pairing and network

The backend listens on loopback only. Local HTTP is permitted only for loopback origins; remote browser-facing origins require HTTPS. Keep a remote instance on a private network with a reverse proxy. This alpha has not been hardened for unrestricted public exposure.

The local `pair` command has filesystem-administrator authority over `STATE_DIR`; it is intentionally not an unauthenticated remote enrollment endpoint. Pairing tokens are random, stored as hashes, expire after ten minutes, and redeem once. Session cookies are HttpOnly, SameSite=Strict, and Secure on HTTPS, with a 24-hour lifetime. State is created with owner-only permissions. Browser mutation requests and WebSocket upgrades require the exact configured Origin and Host.

The model cannot see the pairing link in normal conversation state. The link fragment is removed before the chat loads; nevertheless, keep links out of screenshots, shell logs, transcripts, shared browser history, and bug reports.

## Data and revocation

`STATE_DIR` contains SQLite authorization and durable conversation databases, including text and image tool results. Model providers receive requested content under their own policies. Browser Lab does not add third-party analytics. Markdown from the model cannot embed external images; external links require an explicit user click and use `noreferrer`.

VNC credentials are entered in the viewer and sent through its RFB connection. The app does not write them to its database. The backend terminates the WebSocket and forwards RFB traffic, so the backend host and the VNC transport must both be trusted. Use SSH or equivalent protection when the VNC endpoint is on another host.

**Stop generating** cancels the run, but cannot undo input already delivered. **Disconnect this browser** revokes its session and terminates its active control sockets. `npm run revoke` invalidates all sessions and pending pairing links; other processes detect revocation within about one second. Remove the extension to eliminate its browser authority. Follow the [cleanup steps](docs/quickstart.md#stop-remove-upgrade) to delete retained data.

## Known development dependency advisory

As of October 16, 2026, the production dependency audit reports zero vulnerabilities. The full audit reports five high-severity entries from one unpatched [braces stack-exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), through the Next.js ESLint development dependency chain. No application request path reaches it, and this repository does not configure attacker-controlled lint glob patterns. Automatic CI runs trusted main-branch source only, not pull requests or forks. This is a documented, nonblocking development-tool risk for this source alpha; reassess it before processing untrusted lint inputs or when an upstream patch becomes available.

## Reporting

Please report vulnerabilities privately through [GitHub security advisories](https://github.com/dispatchlabs-ai/browser-lab/security/advisories/new). Do not include live credentials or private screenshots. There is no guaranteed response time or independent certification. The [verification record](docs/verification.md) states the scope of the alpha's review and tests.
