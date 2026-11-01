// Copies Takumi's WASM renderer into public/ so the browser can fetch it from the same origin.
import { copyFileSync, mkdirSync, realpathSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
// @takumi-rs/wasm is a dependency of takumi-js, so resolve it from takumi-js's real (pnpm) location.
const takumiDir = realpathSync(join(root, "node_modules", "takumi-js"))
const requireFromTakumi = createRequire(join(takumiDir, "package.json"))
const source = requireFromTakumi.resolve("@takumi-rs/wasm/takumi_wasm_bg.wasm")
const target = join(root, "public", "takumi", "takumi_wasm_bg.wasm")

mkdirSync(dirname(target), { recursive: true })
copyFileSync(source, target)
console.log(`Copied Takumi WASM to ${target}`)
