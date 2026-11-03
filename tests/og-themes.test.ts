import { describe, expect, it } from "vitest"
import { buildPrPlan } from "@/lib/github/plan"
import { presetSampleParams } from "@/lib/og/presets"
import { renderOgPng } from "@/lib/og/render"
import { ogParamsSchema } from "@/lib/og/schema"
import {
  BUILT_IN_THEMES,
  contrastRatio,
  customColorsSchema,
  DEFAULT_CUSTOM_COLORS,
  derivePalette,
  mix,
  normalizeHex,
  paletteFor,
  swatchesFor,
  themeColors,
  themeName,
  THEME_IDS,
} from "@/lib/og/themes"

describe("normalizeHex", () => {
  it("expands shorthand and lowercases", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc")
    expect(normalizeHex("10B981")).toBe("#10b981")
    expect(normalizeHex("  #10b981 ")).toBe("#10b981")
  })

  it("rejects non-hex input", () => {
    expect(normalizeHex("")).toBeNull()
    expect(normalizeHex("#12")).toBeNull()
    expect(normalizeHex("#ggg")).toBeNull()
    expect(normalizeHex("red")).toBeNull()
  })
})

describe("color math", () => {
  it("mixes between two colors", () => {
    expect(mix("#000000", "#ffffff", 0)).toBe("#000000")
    expect(mix("#000000", "#ffffff", 1)).toBe("#ffffff")
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080")
  })

  it("computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0)
    expect(contrastRatio("#777777", "#777777")).toBe(1)
    expect(contrastRatio("#ffffff", "#000000")).toBe(contrastRatio("#000000", "#ffffff"))
  })
})

describe("built-in themes", () => {
  it("covers every theme id except custom, with unique ids and names", () => {
    expect(BUILT_IN_THEMES.map((theme) => theme.id).sort()).toEqual(THEME_IDS.filter((id) => id !== "custom").sort())
    expect(new Set(BUILT_IN_THEMES.map((theme) => theme.name)).size).toBe(BUILT_IN_THEMES.length)
  })

  it.each(BUILT_IN_THEMES)("$name keeps body text readable", ({ id }) => {
    const palette = paletteFor(id, DEFAULT_CUSTOM_COLORS)
    expect(contrastRatio(palette.background, palette.foreground)).toBeGreaterThanOrEqual(7)
  })

  it("returns four swatches that run from background to text", () => {
    for (const { id } of BUILT_IN_THEMES) {
      const swatches = swatchesFor(id, DEFAULT_CUSTOM_COLORS)
      const palette = paletteFor(id, DEFAULT_CUSTOM_COLORS)
      expect(swatches).toHaveLength(4)
      expect(swatches[0]).toBe(palette.background)
      expect(swatches[3]).toBe(palette.foreground)
    }
  })

  it("resolves names and colors, falling back to custom", () => {
    expect(themeName("dark")).toBe("Default")
    expect(themeName("custom")).toBe("Custom")
    expect(themeColors("maple", DEFAULT_CUSTOM_COLORS).accent).toBe("#e5322d")
    expect(themeColors("custom", DEFAULT_CUSTOM_COLORS)).toEqual(DEFAULT_CUSTOM_COLORS)
  })
})

describe("derived palettes", () => {
  it("puts light text on a dark panel for dark themes", () => {
    const palette = derivePalette({ background: "#0b1220", foreground: "#e6edf7", accent: "#38bdf8" })
    expect(palette.panelMark).toBe("#e6edf7")
    expect(contrastRatio(palette.panel, palette.panelMark)).toBeGreaterThan(4.5)
  })

  it("inverts the panel for light themes", () => {
    const palette = derivePalette({ background: "#eaf2f7", foreground: "#0b1e2d", accent: "#0369a1" })
    expect(palette.panel).toBe("#0b1e2d")
    expect(palette.panelMark).toBe("#eaf2f7")
  })
})

describe("params schema", () => {
  const base = presetSampleParams("spotlight")

  it("accepts every theme id", () => {
    for (const theme of THEME_IDS) expect(ogParamsSchema.safeParse({ ...base, theme }).success).toBe(true)
  })

  it("defaults customColors and normalizes custom hex values", () => {
    const { customColors: _omitted, ...withoutColors } = base
    expect(ogParamsSchema.parse(withoutColors).customColors).toEqual(DEFAULT_CUSTOM_COLORS)
    const parsed = ogParamsSchema.parse({
      ...base,
      theme: "custom",
      customColors: { background: "#000000", foreground: "#FFFFFF", accent: "#AA00FF" },
    })
    expect(parsed.customColors.accent).toBe("#aa00ff")
  })

  it("rejects invalid custom colors and unknown themes", () => {
    expect(customColorsSchema.safeParse({ ...DEFAULT_CUSTOM_COLORS, accent: "nope" }).success).toBe(false)
    expect(ogParamsSchema.safeParse({ ...base, customColors: { ...DEFAULT_CUSTOM_COLORS, background: "#fff" } }).success).toBe(false)
    expect(ogParamsSchema.safeParse({ ...base, theme: "neon" }).success).toBe(false)
  })
})

describe("rendering", () => {
  it("renders a different image for each theme", async () => {
    const base = presetSampleParams("spotlight")
    const bytes = await Promise.all(
      ["dark", "maple", "glacier", "custom"].map(async (theme) =>
        Buffer.from(await renderOgPng(ogParamsSchema.parse({ ...base, theme }))).toString("base64"),
      ),
    )
    expect(new Set(bytes).size).toBe(bytes.length)
  }, 60_000)

  it("renders custom colors", async () => {
    const params = ogParamsSchema.parse({
      ...presetSampleParams("spotlight"),
      theme: "custom",
      customColors: { background: "#101010", foreground: "#fafafa", accent: "#ff00aa" },
    })
    const png = await renderOgPng(params)
    expect(png.byteLength).toBeGreaterThan(1000)
  }, 60_000)
})

describe("PR description", () => {
  const repo = { owner: "acme", name: "site", defaultBranch: "main" }
  const now = new Date("2026-10-24T15:04:05Z")

  it("names a built-in theme", () => {
    const params = ogParamsSchema.parse({ ...presetSampleParams("spotlight"), theme: "maple" })
    const plan = buildPrPlan({ repo, filePath: "app/opengraph-image.png", existingSha: null, params, now })
    expect(plan.prBody).toContain("| Theme | Maple |")
  })

  it("spells out the colors of a custom theme", () => {
    const params = ogParamsSchema.parse({
      ...presetSampleParams("spotlight"),
      theme: "custom",
      customColors: { background: "#101010", foreground: "#fafafa", accent: "#ff00aa" },
    })
    const plan = buildPrPlan({ repo, filePath: "app/opengraph-image.png", existingSha: null, params, now })
    expect(plan.prBody).toContain("Custom (background #101010, text #fafafa, accent #ff00aa)")
  })
})
