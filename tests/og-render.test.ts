import { googleFonts } from "takumi-js/helpers"
import { describe, expect, it } from "vitest"
import type { OgAssets } from "@/lib/og/assets"
import { presetSampleParams } from "@/lib/og/presets"
import { fontsForParams, readPngSize, renderOgPng } from "@/lib/og/render"
import { PRESET_IDS } from "@/lib/og/schema"

const SQUARE_SVG = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#10b981"/></svg>',
)

describe("Takumi rendering", () => {
  it.each(PRESET_IDS)("renders the %s preset at 1200x630 in both themes", async (preset) => {
    for (const theme of ["dark", "light"] as const) {
      const png = await renderOgPng({ ...presetSampleParams(preset), theme })
      expect(readPngSize(png)).toEqual({ width: 1200, height: 630 })
    }
  })

  it("changes the output when the heading font changes", async () => {
    const base = presetSampleParams("statement")
    const playfair = await renderOgPng(base)
    const grotesk = await renderOgPng({ ...base, headingFont: "Space Grotesk" })
    expect(Buffer.from(playfair).equals(Buffer.from(grotesk))).toBe(false)
  })

  it("renders an uploaded logo and differs from the brand mark", async () => {
    const base = presetSampleParams("split")
    const assets: OgAssets = { fonts: [], logo: { fileName: "logo.svg", type: "image/svg+xml", data: SQUARE_SVG } }
    const brand = await renderOgPng(base, { assets })
    const custom = await renderOgPng({ ...base, logo: "custom" }, { assets })
    const none = await renderOgPng({ ...base, logo: "none" })
    expect(readPngSize(custom)).toEqual({ width: 1200, height: 630 })
    expect(Buffer.from(brand).equals(Buffer.from(custom))).toBe(false)
    expect(Buffer.from(custom).equals(Buffer.from(none))).toBe(false)
  })

  it("renders with an uploaded font file", async () => {
    const [subset] = await googleFonts([{ name: "Fraunces", weight: 700 }])
    const data = new Uint8Array(await subset.data())
    const assets: OgAssets = { fonts: [{ name: "Acme Display", fileName: "acme.woff2", data }], logo: null }
    const png = await renderOgPng({ ...presetSampleParams("statement"), headingFont: "Acme Display" }, { assets })
    expect(readPngSize(png)).toEqual({ width: 1200, height: 630 })
  })

  it("fails clearly when a custom asset is missing", async () => {
    await expect(renderOgPng({ ...presetSampleParams("spotlight"), logo: "custom" })).rejects.toThrow(/Upload a logo/)
  })

  it("renders a title with one very long unbroken word at the standard size", async () => {
    const title = "Generatorhttps://cdn.example.com/assets/an-extremely-long-unbroken-path-segment.svg"
    for (const preset of PRESET_IDS) {
      const png = await renderOgPng({ ...presetSampleParams(preset), title })
      expect(readPngSize(png)).toEqual({ width: 1200, height: 630 })
    }
    await expect(
      fontsForParams({ ...presetSampleParams("spotlight"), headingFont: "Gone Sans" }, { fonts: [], logo: null }),
    ).rejects.toThrow(/Gone Sans/)
  })

  it("rejects non-PNG bytes", () => {
    expect(() => readPngSize(new Uint8Array([1, 2, 3]))).toThrow("Not a PNG")
  })
}, 60000)
