# Run the first browser task

This is the operational guide for people and coding agents. Contributor instructions are separate in `AGENTS.md`. Start with one machine and the synthetic test page. Desktop access is optional.

## Prerequisites

- macOS or Linux with Node.js **24.22.1+ or 26.12.1+** within those major versions, npm, Git, and network access. Earlier patch versions and end-of-life Node 25 are unsupported.
- A few GB of free disk space for npm dependencies, the Next.js build, Chromium, and temporary downloads. The isolated browser requires its ordinary OS libraries; on Linux, Playwright reports missing packages.
- For the live demo: an OpenAI API key with access to `gpt-5.4`, supplied as `OPENAI_API_KEY`. API billing is separate from ChatGPT subscriptions. See [OpenAI API authentication](https://platform.openai.com/docs/api-reference/authentication). Provider availability depends on your account.
- For a manual session: a current desktop Chrome with developer-mode extension installation available. Managed-browser policy may prohibit this.

The automatic workflow does not install into an existing browser. It launches Playwright's bundled Chromium with a temporary profile and the generated extension. It deletes that profile and temporary backend state afterward. Screenshots and a short JSON result remain in `.artifacts/`.

## Install

```sh
git clone https://github.com/dispatchlabs-ai/browser-lab.git
cd browser-lab
npm ci --ignore-scripts
npm run check
npm test
npm run build
npx playwright install --no-shell chromium
```

These commands use `main`. To reproduce a published release, choose its tag from [Releases](https://github.com/dispatchlabs-ai/browser-lab/releases) and run `git checkout <release-tag>` immediately after cloning. The source alpha's tag is `v0.1.0-alpha.1`.

On Linux, install any missing browser system libraries using the package instructions printed by Playwright, or `npx playwright install --with-deps --no-shell chromium` if you authorize its package-manager changes. Do not silently change a user's system configuration.

## Verify without model credentials

```sh
npm run test:browser
```

Expected: a JSON result with `ok: true`, `workflow: "extension-smoke"`, and `result: "Hello from Browser Lab"`. Open `.artifacts/browser-check/result.png` and inspect the visible output. This check drives the real extension through its page bridge, exercises the production HTTP/WebSocket authorization boundaries, and verifies live VNC-transport revocation with a synthetic TCP peer. It makes no model request and does not prove native desktop control.

## Run the model demo

Supply credentials through your secret manager or shell environment. Never print the key, paste it into chat, put it in a command argument, or commit it. An ignored `.env` file is also supported; if you use one, restrict it to your user with `chmod 600 .env`.

```sh
# OPENAI_API_KEY is already present in the environment.
npm run demo
# Optional visible window on a machine with a graphical session:
npm run demo -- --headed
```

The model opens a new tab, observes the included test page, types the message, clicks the button, and observes the result. Expected: `workflow: "live-model"`, `ok: true`, and the same exact message. Inspect `.artifacts/demo/result.png`, `chat.png`, and `result.json`. A successful result also confirms that chat history survives a reload. The command closes the temporary browser when finished.

The workflow uses a temporary localhost port and state directory, regardless of a remote `APP_ORIGIN` in your normal configuration. It uses your selected model and environment credentials. It reads an existing Pi login file only when you explicitly set `PI_AUTH`; an opted-in OAuth login may refresh that file. Otherwise its provider store is temporary too. It does not enable a real VNC connection. It has bounded waits and reports failure instead of claiming success when the model does not complete the task.

Coding agents should report which checks passed, the actual model and platform, the visible result, and any unresolved setup. Missing credentials are a request for a private credential route, not permission to search unrelated accounts or change providers silently. Do not claim that the live demo ran when only the smoke check passed.

## Manual Chrome session

```sh
cp .env.example .env
chmod 600 .env
# Edit public settings and supply credentials privately.
npm run configure
npm run doctor -- --json
npm start
```

Keep the server running. `npm run dev` is available while developing; use the production build for qualification.

1. In a dedicated Chrome profile, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the absolute `dist/extension` directory printed by `configure`.
2. In another terminal with the same configuration, run `npm run pair`. Open its private one-use link in that Chrome profile within ten minutes. Do not paste the link into an agent transcript or bug report. A local agent with browser tools may capture and navigate to the link without displaying it.
3. Confirm **Chrome extension connected** in the chat.
4. Send: `Open http://localhost:3210/probe.html in a new tab, type Hello from Browser Lab into Message, click Show message, and verify the output.` Substitute your configured origin if different.
5. Inspect the actual test page and the agent's final report.

After changing `APP_ORIGIN`, run `npm run configure`, reload the extension on `chrome://extensions`, and reload the chat. Keep the controlling chat open during a run. One conversation should be open in one controlling tab; opening it elsewhere replaces its bridge connection.

## Configuration

Root `.env` is optional. Existing process environment values take precedence. There is one source of origin configuration; `configure` derives the extension from it.

| Setting            | Default                         | Meaning                                                                   |
| ------------------ | ------------------------------- | ------------------------------------------------------------------------- |
| `APP_ORIGIN`       | `http://localhost:3210`         | Exact browser-facing origin; remote origins require HTTPS                 |
| `PORT`             | `3210`                          | Server port; server always binds `127.0.0.1`                              |
| `MODEL_PROVIDER`   | `openai`                        | Pi provider ID                                                            |
| `MODEL_ID`         | `gpt-5.4`                       | A vision-capable model in the pinned Pi catalog                           |
| `THINKING_LEVEL`   | `medium`                        | Pi reasoning setting supported by the selected model                      |
| `OPENAI_API_KEY`   | unset                           | Default provider credential; other providers use Pi's environment mapping |
| `STATE_DIR`        | `~/.local/share/browser-lab`    | Private authorization, transcript, and tool-result storage                |
| `PI_AUTH`          | `$STATE_DIR/provider-auth.json` | Optional existing Pi credential file, explicitly opted into               |
| `VNC_HOST`         | unset                           | Enables the optional VNC tunnel to this host                              |
| `VNC_PORT`         | `5900`                          | VNC endpoint port as seen by the backend                                  |
| `DESKTOP_PLATFORM` | `mac`                           | `mac` or `linux` keyboard mapping; Linux desktop remains unqualified      |

For an existing Pi login, set `PI_AUTH` to its absolute credential-file path and choose the matching provider/model. For example, a ChatGPT-backed Pi login uses provider `openai-codex`; availability and terms are controlled by the provider. Browser Lab does not perform OAuth login itself and never copies credentials from another tool automatically. Consult [Pi's authentication documentation](https://github.com/earendil-works/pi/tree/main/packages/coding-agent) for that optional route. Other Pi providers are configurable, but only the models in the [verification record](verification.md) have been tested here.

## Diagnose and recover

`npm run doctor -- --json` checks configuration, model vision support, credential resolution, generated extension origin, and build presence. Add `--live` to check server health. It makes no paid request and cannot prove that a key is accepted or an extension is installed. Resolving an opted-in OAuth login may refresh its credential file.

| Symptom                                   | Action                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `PROVIDER_CREDENTIALS` fails              | Supply the selected provider's key or explicit Pi login file; do not expose it in diagnostics |
| `VISION_MODEL` fails                      | Choose a vision model present in the pinned Pi release                                        |
| Extension not connected                   | Load `dist/extension`, check the exact origin, reload both extension and chat                 |
| Pairing expired or used                   | Run `npm run pair` again; links are single-use                                                |
| `HOST_REJECTED` / `ORIGIN_REJECTED`       | Use `APP_ORIGIN` exactly and preserve Host/Origin through your proxy                          |
| Connection lost or action outcome unknown | Inspect the page before repeating; a click may already have happened                          |
| Browser libraries missing                 | Follow Playwright's OS dependency instructions, then rerun                                    |
| Model fails or times out                  | Check account access and the chat error; inspect the test page before trying again            |

## Stop, remove, upgrade

Use **Stop generating** to cancel the current model run. Cancellation cannot undo an action already delivered. **Disconnect this browser** revokes that browser session. `npm run revoke` revokes all sessions and unused pairing links; existing bridges and VNC connections are terminated, including sessions in other browsers.

Stop the server with Ctrl-C. Remove the unpacked extension from Chrome to remove its debugger authority. Disconnect noVNC and close any SSH tunnel you created. Delete `.artifacts/` to remove local demo evidence. To delete all saved conversations and pairing state, stop the server and remove the exact `STATE_DIR` you configured; do not remove a separate `PI_AUTH` file that another application owns.

For upgrades, stop the app, back up your private state, check out the new tag, run `npm ci --ignore-scripts`, build and configure again, then reload the extension and start the app. This alpha does not promise compatibility with future transcript schemas; keep the backup until you verify the new version.
