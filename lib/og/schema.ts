import { z } from "zod"

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

export const PRESET_IDS = ["spotlight", "split", "statement", "announcement"] as const
export type PresetId = (typeof PRESET_IDS)[number]

export const THEMES = ["dark", "light"] as const
export type OgTheme = (typeof THEMES)[number]

export const LOGO_MODES = ["brand", "custom", "none"] as const
export type LogoMode = (typeof LOGO_MODES)[number]

export const LIMITS = {
  title: 120,
  description: 240,
  eyebrow: 40,
  siteUrl: 80,
  fontName: 64,
} as const

export interface GoogleFontChoice {
  family: string
  category: "serif" | "sans" | "mono"
}

/** Variable Google fonts that all cover weights 400 through 700. */
export const GOOGLE_FONTS: readonly GoogleFontChoice[] = [
  { family: "Playfair Display", category: "serif" },
  { family: "Inter", category: "sans" },
  { family: "Fraunces", category: "serif" },
  { family: "Newsreader", category: "serif" },
  { family: "Source Serif 4", category: "serif" },
  { family: "Space Grotesk", category: "sans" },
  { family: "DM Sans", category: "sans" },
  { family: "Bricolage Grotesque", category: "sans" },
  { family: "JetBrains Mono", category: "mono" },
]

export const DEFAULT_FONTS = { heading: "Playfair Display", body: "Inter" } as const

export function isGoogleFont(family: string): boolean {
  return GOOGLE_FONTS.some((font) => font.family === family)
}

const fontName = z.string().trim().min(1, "Pick a font").max(LIMITS.fontName)

export const ogParamsSchema = z.object({
  preset: z.enum(PRESET_IDS).default("spotlight"),
  theme: z.enum(THEMES).default("dark"),
  title: z.string().trim().min(1, "Title is required").max(LIMITS.title),
  description: z.string().trim().max(LIMITS.description).default(""),
  eyebrow: z.string().trim().max(LIMITS.eyebrow).default("Canadian AI"),
  siteUrl: z
    .string()
    .trim()
    .max(LIMITS.siteUrl)
    .transform((value) => value.replace(/^https?:\/\//i, "").replace(/\/+$/, ""))
    .default("canadian.ai"),
  headingFont: fontName.default(DEFAULT_FONTS.heading),
  bodyFont: fontName.default(DEFAULT_FONTS.body),
  logo: z.enum(LOGO_MODES).default("brand"),
})

export type OgParams = z.output<typeof ogParamsSchema>
export type OgParamsInput = z.input<typeof ogParamsSchema>

/** Scales the headline so long titles still fit the 1200x630 canvas. */
export function titleFontSize(title: string, base = 88): number {
  const length = title.trim().length
  if (length <= 32) return base
  if (length <= 56) return Math.round(base * 0.82)
  if (length <= 84) return Math.round(base * 0.68)
  return Math.round(base * 0.56)
}
