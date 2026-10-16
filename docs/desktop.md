# Optional desktop and remote backend

Complete the [browser task](quickstart.md) first. A VNC server and its permissions belong to you; Browser Lab does not install one, enable screen capture, or configure unattended access.

## Connect a desktop

1. Arrange an authenticated VNC endpoint you control. For the macOS demonstration, the existing system Screen Sharing service was used. Keep the service private and restrict who can connect.
2. Make the endpoint reachable from the **backend machine**. If it is on another machine, use an SSH tunnel or equivalent secure private transport. For example, run this on the backend, substituting your own SSH host:

   ```sh
   ssh -N -L 15903:127.0.0.1:5900 desktop-host
   ```

3. Add `VNC_HOST=127.0.0.1`, `VNC_PORT=15903`, and `DESKTOP_PLATFORM=mac` to the backend configuration, then restart Browser Lab. Use port `5900` when the VNC service is local without that tunnel.
4. In the paired Chrome profile, open **Desktop**, choose **Connect**, and enter the VNC credentials directly in the viewer. The password field is cleared after submission. Do not ask the model to handle your login or paste it into chat.
5. Leave the desktop tab open and return to the chat. Ask the agent to inspect it first. Use a clean desktop with synthetic content before trying input.

A small demonstration: ask it to open Calculator, calculate `58 × 17`, and verify `986` on a fresh desktop observation. Observe the actual result yourself. The model should use the background viewer; manually foregrounding the viewer on the same display can recreate the mirror effect.

macOS native desktop control is the qualified target for this alpha; Linux keyboard mapping is provided but Linux desktop control is unqualified. Browser-only Linux support does not imply desktop support. Windows is not qualified. VNC authentication, display resolution, and server behavior vary; report the actual server and workflow when sharing results.

## Put the backend on another machine

Install and build the same tagged source there, configure its own model credentials and private state, and run the server on loopback. Set `APP_ORIGIN` to your browser-facing HTTPS origin. Your reverse proxy must preserve the incoming Host and Origin and support WebSocket upgrades for `/bridge` and `/vnc`.

For example, a Caddy site on the backend can proxy a domain you own:

```caddyfile
lab.example.com {
    reverse_proxy 127.0.0.1:3210
}
```

Supply your own DNS, TLS issuance and network access controls. The example is not authorization to expose desktop control to the public Internet. The app does not manage certificates or firewall rules. Keep this alpha on a private network.

Run `npm run configure` with the same `APP_ORIGIN`, copy only `dist/extension` to the browser machine, and load it in the dedicated Chrome profile. Do not copy `.env`, state, or model credentials with the extension. Run `npm run pair` on the backend and privately open that link on the browser machine. The backend's `STATE_DIR` is the one to back up or revoke.

No personal inventory or infrastructure repository is needed for these steps. Persistent services, DNS and fleet configuration are intentionally left to your deployment system. `npm start` is a foreground process; a service manager should launch that same command with the configured working directory and private environment.
