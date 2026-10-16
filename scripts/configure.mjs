import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { loadEnvironment, configuration, root } from "./config.mjs"
export async function generateExtension(
  origin,
  target = join(root, "dist/extension")
) {
  await mkdir(target, { recursive: true })
  for (const name of ["bridge.js", "worker.js"]) {
    const source = await readFile(
      join(root, "packages/extension", name),
      "utf8"
    )
    await writeFile(
      join(target, name),
      source.replaceAll("__BROWSER_LAB_ORIGIN__", origin)
    )
  }
  const manifest = JSON.parse(
    await readFile(join(root, "packages/extension/manifest.json"), "utf8")
  )
  manifest.content_scripts[0].matches = [`${origin}/*`]
  await writeFile(
    join(target, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  )
  return target
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  loadEnvironment()
  const config = configuration()
  console.log(
    JSON.stringify({
      ok: true,
      extensionPath: await generateExtension(config.origin),
      origin: config.origin,
    })
  )
}
