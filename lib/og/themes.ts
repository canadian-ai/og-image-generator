import { z } from "zod"
import { MARK_FILL, SOCIAL_ACCENT } from "./brand"

export const THEME_IDS = ["dark", "light", "maple", "midnight", "ember", "glacier", "mono", "custom"] as const
export type ThemeId = (typeof THEME_IDS)[number]

/** The three colors a person picks; every other palette color is derived from them. */
export interface ThemeColors {
  background: string
  foreground: string
  accent: string
}

export interface Palette extends ThemeColors {
  muted: string
  line: string
  panel: string
  /** Fill for the logo when it sits on `panel`. */
  panelMark: string
  /** Fill for the logo when it sits on `background`. */
  mark: string
}

export interface ThemeDefinition {
  id: Exclude<ThemeId, "custom">
  name: string
  colors: ThemeColors
  /** Brand-exact values that win over the derived ones. */
  overrides?: Partial<Palette>
}

export const BUILT_IN_THEMES: readonly ThemeDefinition[] = [
  {
    id: "dark",
    name: "Default",
    colors: { background: SOCIAL_ACCENT.void, foreground: SOCIAL_ACCENT.pearl, accent: SOCIAL_ACCENT.emerald },
    overrides: {
      muted: SOCIAL_ACCENT.mist,
      line: SOCIAL_ACCENT.slate,
      panel: SOCIAL_ACCENT.slate,
      mark: MARK_FILL.white,
      panelMark: MARK_FILL.white,
    },
  },
  {
    id: "light",
    name: "Paper",
    colors: { background: SOCIAL_ACCENT.pearl, foreground: SOCIAL_ACCENT.void, accent: "#059669" },
    overrides: {
      muted: SOCIAL_ACCENT.slate,
      line: SOCIAL_ACCENT.zinc,
      panel: SOCIAL_ACCENT.void,
      mark: MARK_FILL.black,
      panelMark: MARK_FILL.white,
    },
  },
  { id: "maple", name: "Maple", colors: { background: "#1a0f0f", foreground: "#f6ece9", accent: "#e5322d" } },
  { id: "midnight", name: "Midnight", colors: { background: "#0b1220", foreground: "#e6edf7", accent: "#38bdf8" } },
  { id: "ember", name: "Ember", colors: { background: "#16110d", foreground: "#f5ede4", accent: "#f97316" } },
  { id: "glacier", name: "Glacier", colors: { background: "#eaf2f7", foreground: "#0b1e2d", accent: "#0369a1" } },
  { id: "mono", name: "Mono", colors: { background: "#0a0a0a", foreground: "#fafafa", accent: "#fafafa" } },
]

export const CUSTOM_THEME_NAME = "Custom"

export const DEFAULT_CUSTOM_COLORS: ThemeColors = { background: "#10231c", foreground: "#f1f7f4", accent: "#f5c542" }

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{6}$/i, "Use a 6-digit hex color like #10b981")
  .transform((value) => value.toLowerCase())

export const customColorsSchema = z.object({
  background: hexColor,
  foreground: hexColor,
  accent: hexColor,
})

/** Accepts `#abc`, `abc`, `#aabbcc` or `AABBCC` and returns `#aabbcc`, or null when it isn't a hex color. */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "")
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw
      .split("")
      .map((char) => char + char)
      .join("")
      .toLowerCase()}`
  }
  return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw.toLowerCase()}` : null
}

type Rgb = [number, number, number]

function parseHex(hex: string): Rgb {
  const value = normalizeHex(hex) ?? "#000000"
  return [1, 3, 5].map((start) => Number.parseInt(value.slice(start, start + 2), 16)) as Rgb
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`
}

/** Moves `from` toward `to` by `amount` (0 keeps `from`, 1 gives `to`). */
export function mix(from: string, to: string, amount: number): string {
  const a = parseHex(from)
  const b = parseHex(to)
  return toHex([0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * amount) as Rgb)
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

export function derivePalette(colors: ThemeColors): Palette {
  const { background, foreground } = colors
  const isDark = relativeLuminance(background) < relativeLuminance(foreground)
  return {
    ...colors,
    muted: mix(foreground, background, 0.3),
    line: mix(foreground, background, 0.75),
    panel: isDark ? mix(foreground, background, 0.82) : foreground,
    panelMark: isDark ? foreground : background,
    mark: foreground,
  }
}

export function getBuiltInTheme(id: ThemeId): ThemeDefinition | undefined {
  return BUILT_IN_THEMES.find((theme) => theme.id === id)
}

export function themeName(id: ThemeId): string {
  return getBuiltInTheme(id)?.name ?? CUSTOM_THEME_NAME
}

/** The background, text and accent colors of a theme, or the custom ones for `custom`. */
export function themeColors(id: ThemeId, custom: ThemeColors): ThemeColors {
  return getBuiltInTheme(id)?.colors ?? custom
}

export function paletteFor(id: ThemeId, custom: ThemeColors): Palette {
  const builtIn = getBuiltInTheme(id)
  if (!builtIn) return derivePalette(custom)
  return { ...derivePalette(builtIn.colors), ...builtIn.overrides }
}

/** Four swatches from the page color to the text color, for theme cards. */
export function swatchesFor(id: ThemeId, custom: ThemeColors): [string, string, string, string] {
  const palette = paletteFor(id, custom)
  return [palette.background, palette.line, palette.accent, palette.foreground]
}
