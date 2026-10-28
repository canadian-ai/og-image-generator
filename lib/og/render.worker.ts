import type { OgAssets } from "./assets"
import { renderOgPng } from "./render"
import type { OgParams } from "./schema"

export interface RenderRequest {
  id: number
  params: OgParams
  assets: OgAssets
}

export type RenderResponse = { id: number; png: Uint8Array } | { id: number; error: string }

const wasmUrl = new URL("/takumi/takumi_wasm_bg.wasm", self.location.origin)
const wasmModule = WebAssembly.compileStreaming(fetch(wasmUrl))

self.onmessage = async (event: MessageEvent<RenderRequest>) => {
  const { id, params, assets } = event.data
  try {
    const png = await renderOgPng(params, { assets, module: wasmModule })
    self.postMessage({ id, png } satisfies RenderResponse, { transfer: [png.buffer] })
  } catch (caught) {
    const error = caught instanceof Error ? caught.message : "Render failed"
    self.postMessage({ id, error } satisfies RenderResponse)
  }
}
