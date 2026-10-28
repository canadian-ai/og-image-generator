import type { OgAssets } from "./assets"
import type { RenderRequest, RenderResponse } from "./render.worker"
import type { OgParams } from "./schema"

type Pending = { resolve: (png: Uint8Array) => void; reject: (error: Error) => void }

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, Pending>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL("./render.worker.ts", import.meta.url), { type: "module" })
  worker.onmessage = (event: MessageEvent<RenderResponse>) => {
    const entry = pending.get(event.data.id)
    if (!entry) return
    pending.delete(event.data.id)
    if ("png" in event.data) entry.resolve(event.data.png)
    else entry.reject(new Error(event.data.error))
  }
  worker.onerror = (event) => {
    const error = new Error(event.message || "The Takumi renderer crashed. Reload the page to retry.")
    for (const entry of pending.values()) entry.reject(error)
    pending.clear()
    worker?.terminate()
    worker = null
  }
  return worker
}

/** Renders a card with Takumi WASM in a Web Worker. Nothing leaves the browser. */
export function renderInBrowser(params: OgParams, assets: OgAssets): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, params, assets } satisfies RenderRequest)
  })
}
