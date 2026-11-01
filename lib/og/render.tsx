import { render } from "takumi-js"
import { googleFonts } from "takumi-js/helpers"
import { EMPTY_ASSETS, LOGO_IMAGE_SRC, type OgAssets } from "./assets"
import { isGoogleFont, OG_HEIGHT, OG_WIDTH, type OgParams } from "./schema"
import { OgTemplate } from "./templates"

type RenderOptions = NonNullable<Parameters<typeof render>[1]>
type FontLoaders = Awaited<NonNullable<RenderOptions["fonts"]>>

const googleFontCache = new Map<string, Promise<FontLoaders>>()

/** Loads a curated Google family once per session; subsets are fetched lazily by the renderer. */
function loadGoogleFamily(family: string): Promise<FontLoaders> {
  let pending = googleFontCache.get(family)
  if (!pending) {
    pending = googleFonts([{ name: family, weight: [400, 500, 600, 700] }]) as Promise<FontLoaders>
    pending.catch(() => googleFontCache.delete(family))
    googleFontCache.set(family, pending)
  }
  return pending
}

/** The Google families plus uploaded font files a card actually references. */
export async function fontsForParams(params: OgParams, assets: OgAssets): Promise<FontLoaders> {
  const families = [...new Set([params.headingFont, params.bodyFont])]
  const uploaded = assets.fonts
    .filter((font) => families.includes(font.name))
    .map((font) => ({ name: font.name, data: font.data }))
  const missing = families.filter((family) => !isGoogleFont(family) && !uploaded.some((font) => font.name === family))
  if (missing.length > 0) throw new Error(`Font not loaded: ${missing.join(", ")}. Upload it again.`)

  const google = await Promise.all(families.filter(isGoogleFont).map(loadGoogleFamily))
  return [...uploaded, ...google.flat()] as FontLoaders
}

export interface RenderOgOptions {
  assets?: OgAssets
  /** Overrides font loading, e.g. to pin fonts in tests. */
  fonts?: RenderOptions["fonts"]
  /** WASM module or URL for the browser backend. Node uses the native backend. */
  module?: WebAssembly.Module | Promise<WebAssembly.Module> | URL | string
}

/**
 * Renders a card to a 1200x630 PNG. Runs in the browser (Takumi WASM) and in Node
 * (native) from the same templates, so tests exercise the exact bytes users commit.
 */
export async function renderOgPng(params: OgParams, options: RenderOgOptions = {}): Promise<Uint8Array> {
  const assets = options.assets ?? EMPTY_ASSETS
  if (params.logo === "custom" && !assets.logo) throw new Error("Upload a logo or switch back to the brand mark.")

  const output = await render(<OgTemplate {...params} />, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    format: "png",
    fonts: options.fonts ?? fontsForParams(params, assets),
    images: assets.logo && params.logo === "custom" ? [{ src: LOGO_IMAGE_SRC, data: assets.logo.data }] : [],
    ...(options.module ? { module: options.module } : {}),
  } as RenderOptions)
  return new Uint8Array(output)
}

/** Reads width/height from a PNG IHDR chunk. */
export function readPngSize(bytes: Uint8Array): { width: number; height: number } {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length < 24 || !signature.every((byte, index) => bytes[index] === byte)) {
    throw new Error("Not a PNG")
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}
