import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  assetsKey,
  familyNameFromFile,
  looksLikeFont,
  validateFontFile,
  validateLogoFile,
} from "@/lib/og/assets"
import { CAI_MARK_PATH } from "@/lib/og/brand"
import { PRESETS, presetSampleParams } from "@/lib/og/presets"
import { DEFAULT_FONTS, GOOGLE_FONTS, isGoogleFont, ogParamsSchema, PRESET_IDS, titleFontSize } from "@/lib/og/schema"

describe("ogParamsSchema", () => {
  it("applies brand defaults, including fonts and logo", () => {
    expect(ogParamsSchema.parse({ title: "Hello" })).toEqual({
      preset: "spotlight",
      theme: "dark",
      title: "Hello",
      description: "",
      eyebrow: "Canadian AI",
      siteUrl: "canadian.ai",
      headingFont: "Playfair Display",
      bodyFont: "Inter",
      logo: "brand",
    })
  })

  it("rejects a missing or blank title", () => {
    expect(ogParamsSchema.safeParse({}).success).toBe(false)
    expect(ogParamsSchema.safeParse({ title: "   " }).success).toBe(false)
  })

  it("rejects unknown presets, logo modes and oversized fields", () => {
    expect(ogParamsSchema.safeParse({ title: "x", preset: "nope" }).success).toBe(false)
    expect(ogParamsSchema.safeParse({ title: "x", logo: "remote" }).success).toBe(false)
    expect(ogParamsSchema.safeParse({ title: "x".repeat(121) }).success).toBe(false)
    expect(ogParamsSchema.safeParse({ title: "x", headingFont: "" }).success).toBe(false)
  })

  it("normalizes the site url", () => {
    expect(ogParamsSchema.parse({ title: "x", siteUrl: "https://canadian.ai/tools/" }).siteUrl).toBe("canadian.ai/tools")
  })
})

describe("fonts", () => {
  it("ships the brand pairing as the default curated fonts", () => {
    expect(isGoogleFont(DEFAULT_FONTS.heading)).toBe(true)
    expect(isGoogleFont(DEFAULT_FONTS.body)).toBe(true)
    expect(new Set(GOOGLE_FONTS.map((font) => font.family)).size).toBe(GOOGLE_FONTS.length)
    expect(isGoogleFont("Comic Sans MS")).toBe(false)
  })
})

describe("uploaded assets", () => {
  it("derives a family name from the file name", () => {
    expect(familyNameFromFile("acme-sans_bold.woff2")).toBe("Acme Sans Bold")
    expect(familyNameFromFile(".ttf")).toBe("Custom Font")
  })

  it("validates font and logo files by extension, type and size", () => {
    expect(validateFontFile({ name: "Brand.OTF", size: 1000 })).toBeNull()
    expect(validateFontFile({ name: "brand.zip", size: 1000 })).toMatch(/ttf/)
    expect(validateFontFile({ name: "brand.ttf", size: 6 * 1024 * 1024 })).toMatch(/5 MB/)
    expect(validateLogoFile({ type: "image/svg+xml", size: 2000 })).toBeNull()
    expect(validateLogoFile({ type: "image/gif", size: 2000 })).toMatch(/SVG/)
    expect(validateLogoFile({ type: "image/png", size: 2 * 1024 * 1024 })).toMatch(/1 MB/)
  })

  it("recognizes font magic bytes", () => {
    expect(looksLikeFont(new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0]))).toBe(true)
    expect(looksLikeFont(new Uint8Array([0x00, 0x01, 0x00, 0x00]))).toBe(true)
    expect(looksLikeFont(new TextEncoder().encode("<svg"))).toBe(false)
  })

  it("changes the cache key when uploaded bytes change", () => {
    const font = { name: "A", fileName: "a.ttf", data: new Uint8Array([1, 2, 3]) }
    const a = assetsKey({ fonts: [font], logo: null })
    const b = assetsKey({ fonts: [{ ...font, data: new Uint8Array([1, 2, 4]) }], logo: null })
    expect(a).not.toBe(b)
    expect(assetsKey({ fonts: [font], logo: null })).toBe(a)
  })
})

describe("presets", () => {
  it("defines every preset id exactly once with valid sample content", () => {
    expect(PRESETS.map((preset) => preset.id).sort()).toEqual([...PRESET_IDS].sort())
    for (const preset of PRESETS) {
      expect(ogParamsSchema.safeParse(presetSampleParams(preset.id)).success).toBe(true)
    }
  })
})

describe("titleFontSize", () => {
  it("shrinks monotonically as titles grow", () => {
    const sizes = [10, 40, 70, 110].map((length) => titleFontSize("x".repeat(length)))
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a))
    expect(sizes[0]).toBe(88)
  })
})

describe("brand mark", () => {
  it("matches the path in components/cai-logo.tsx (copied from brand-components)", () => {
    const source = readFileSync(new URL("../components/cai-logo.tsx", import.meta.url), "utf8")
    expect(source).toContain(`d="${CAI_MARK_PATH}"`)
  })
})
