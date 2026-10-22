# Alpha verification

## Runtime security update — October 22, 2026

Version `0.1.0-alpha.2` requires Node.js 24.22.1+ or 26.12.1+ within those major
versions after the October 21 Node security release. Earlier patch versions and
end-of-life Node 25 are unsupported. The source distribution does not install or
bundle Node; update the host runtime before starting the application.

On macOS arm64 with Node 24.22.1, the complete credential-free `scripts/check`
passed: installation, type/lint/syntax checks, six unit checks, production build,
real Chromium extension workflow, authorization/revocation checks and production
audit. Chromium 156.0.8078.4 displayed “Hello from Browser Lab” in the synthetic
page. No model or native-desktop requalification is claimed for this update.

## Initial source alpha — October 16, 2026

Verified on October 16, 2026. This source alpha qualifies the small workflows below. It does not establish broad desktop reliability, unattended safety, or compatibility with every coding agent or Pi provider.

| Workflow                                       | Evidence                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| macOS source installation and production build | macOS 27.0.1 arm64, Node 26.5.0: clean clone, `npm ci --ignore-scripts`, type/lint/syntax checks, six unit checks, and production build passed.                                                                                                                                                                          |
| Linux source installation and browser workflow | Linux x86_64, Node 24.19.0: isolated clean clone, production build, checks, six unit checks, extension task and production audit passed at `429522f`. Chromium 156.0.8078.4 used Playwright's Ubuntu 24.04 fallback build on the tested Arch-based host.                                                                 |
| Real Chromium extension task                   | Chromium 156.0.8078.4 on macOS and Linux opened the synthetic test page, typed `Hello from Browser Lab`, clicked Show message, and observed the matching output. This uses the real extension and debugger API.                                                                                                          |
| HTTP and control authorization                 | Production-server checks passed for unauthenticated denial, origin rejection, single-use pairing, current/all-session revocation, and termination of active bridge/VNC connections. VNC transport checks used a synthetic TCP peer.                                                                                      |
| Real model browser task                        | OpenAI API / `gpt-5.4` completed the browser task on macOS. Saved screenshots show the message in the input and output; chat history survived reload.                                                                                                                                                                    |
| Native macOS desktop                           | Public-alpha code with `gpt-5.4`, macOS Screen Sharing and an isolated Chromium profile calculated `61 × 13 = 793` in native Calculator. The model used keyboard input and mouse clicks through noVNC; fresh RFB observations and an independent Calculator read agreed. Every desktop tool reported `tabActive: false`. |
| Independent security and open-source review    | No concrete release blocker in `658855e`. Review covered authorization, revocation, bridge binding, diagnostics, API documentation, licensing, attribution, all reachable Git blobs, local documentation links, the public image and launch claims.                                                                      |

## Fresh-agent onboarding

Both runs use the exact prompt in the README with a privately supplied `OPENAI_API_KEY`. They start from a new clone, use the public repository documentation, and perform real model calls. They are command-line agent sessions with shell/file/Git/network access; this is not a claim that every hosted chat surface provides those capabilities.

- **Claude Code 2.1.296**, macOS arm64, Node 26.5.0, source `794304e`: install, checks, five then-current unit checks, build, extension smoke and live GPT-5.4 task passed. The saved result was visually inspected. Claude found two setup issues: doctor falsely reported the environment credential missing, and the demo touched the normal provider-store path. Both were repaired in `3090d3f` / `429522f`; a credential-resolution regression check was added.
- **Codex CLI 0.162.0-alpha.17.2**, macOS arm64, Node 26.5.0, source `658855e`: install, checks, six unit checks, build and extension smoke passed. The first live GPT-5.4 attempt opened the test page, then hit the five-minute completion deadline with the message field still empty. Codex preserved its failure images and started a fresh isolated demo; that retry passed without source changes at 15:37:18 UTC, including history reload and visual inspection. The cause of the first stall was not established. This is a successful onboarding with one model-demo retry, not evidence of deterministic completion.

An earlier Codex attempt ran out of local disk space while downloading browser binaries. Only disposable qualification files were removed. The guide now calls out disk requirements and downloads only the Chromium binary used by the workflow, without the unused headless-shell binary.

## Audit and limits

The production dependency audit reports zero vulnerabilities. The full audit reports five high-severity entries from one unpatched development-only lint dependency advisory. The independent review found it nonblocking for this alpha's trusted-source CI; details and conditions are in [SECURITY.md](../SECURITY.md#known-development-dependency-advisory). This is a scoped review, not a security certification.

Repository-owned `./scripts/check` runs credential-free CI on maintainer-owned Linux infrastructure. Real model calls and desktop access are excluded from automatic CI. Release status is attached to the exact Git commit; a check of another revision is not a substitute.

Linux native desktop, Windows, other providers, public Internet hosting and multi-user operation are unqualified. The public native-desktop recheck used isolated Chromium; the earlier private prototype also verified an installed Chrome session with a hidden noVNC viewer and `58 × 17 = 986`. That earlier result is historical evidence, not a clean-clone qualification of this release.

Browser test artifacts are generated locally under ignored `.artifacts/`. The repository includes only screenshots from the synthetic browser demo. Private desktop screenshots, authentication material and raw transcripts remain outside public source.
