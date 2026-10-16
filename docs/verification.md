# Alpha verification

This record distinguishes reproducible checks from model and desktop demonstrations. It will be finalized with the source-alpha release after clean-clone and independent review gates finish. Do not treat an in-progress row as a passed qualification.

| Workflow                                                           | Current evidence                                                                 |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| macOS production build, type/lint checks, five focused unit checks | Passed on October 16, 2026                                                       |
| macOS isolated Chromium extension task                             | Passed: output `Hello from Browser Lab`, real debugger click/type/observe        |
| HTTP and live WebSocket/VNC revocation                             | Passed with production server and synthetic TCP peer                             |
| Default OpenAI API / GPT-5.4 model task                            | In qualification                                                                 |
| Linux clean clone and isolated Chromium                            | In qualification                                                                 |
| Exact README prompt in fresh Claude and Codex sessions             | In qualification                                                                 |
| Independent security and open-source review                        | Security findings repaired; final public candidate review pending                |
| Native macOS desktop through background noVNC                      | Earlier private prototype verified `58 × 17 = 986`; public alpha recheck pending |

The browser test artifacts are generated locally under ignored `.artifacts/`. No private desktop screenshot, authentication material, or transcript is included in the public source. Linux native desktop, Windows, other model providers, public Internet hosting, and multi-user use are unqualified.
