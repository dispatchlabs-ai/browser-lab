# Third-party notices

Browser Lab's UI derives from [shadcn-ui/chatbot-template](https://github.com/shadcn-ui/chatbot-template), retrieved October 16, 2026. Its original MIT copyright notice is preserved in the root LICENSE alongside Chris Reynolds's notice for original work.

Runtime dependencies are obtained from npm, pinned in `package-lock.json`, and retain their own licenses in their installed packages. Principal components include:

| Component                                             | Role                                      | License    |
| ----------------------------------------------------- | ----------------------------------------- | ---------- |
| [Pi / Earendil](https://github.com/earendil-works/pi) | Durable agent runtime and model providers | MIT        |
| [noVNC](https://github.com/novnc/noVNC)               | RFB viewer and desktop input              | MPL-2.0    |
| [Next.js](https://github.com/vercel/next.js)          | Web application                           | MIT        |
| [React](https://github.com/facebook/react)            | UI                                        | MIT        |
| [Playwright](https://github.com/microsoft/playwright) | Isolated verification browser             | Apache-2.0 |

Browser Lab loads the unmodified noVNC package from `node_modules`; it does not relicense that code as MIT. If you distribute a bundled application or browser, carry forward the applicable dependency and browser notices. This release distributes the application source and lockfile, not a browser binary or bundled dependency archive.
