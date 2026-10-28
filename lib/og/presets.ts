import { DEFAULT_FONTS, type OgParams, type PresetId } from "./schema"

type StyleFields = "preset" | "headingFont" | "bodyFont" | "logo"

export interface PresetDefinition {
  id: PresetId
  name: string
  summary: string
  usesDescription: boolean
  sample: Omit<OgParams, StyleFields>
}

export const PRESETS: readonly PresetDefinition[] = [
  {
    id: "spotlight",
    name: "Spotlight",
    summary: "The canonical brand social card. Framed, serif headline, emerald rule.",
    usesDescription: true,
    sample: {
      theme: "dark",
      eyebrow: "Canadian AI",
      title: "Favicon Generator",
      description: "Deterministic favicon management for Next.js, shipped as a pull request.",
      siteUrl: "canadian.ai",
    },
  },
  {
    id: "split",
    name: "Split",
    summary: "Copy on the left, oversized mark on the right. Good for product pages.",
    usesDescription: true,
    sample: {
      theme: "dark",
      eyebrow: "Product",
      title: "OG Image Generator",
      description: "Render on-brand 1200x630 cards with Takumi and open a PR in one pass.",
      siteUrl: "canadian.ai/tools",
    },
  },
  {
    id: "statement",
    name: "Statement",
    summary: "One centered line, nothing else. For essays and announcements of record.",
    usesDescription: false,
    sample: {
      theme: "light",
      eyebrow: "Essay",
      title: "Sovereign compute is a policy choice",
      description: "",
      siteUrl: "canadian.ai/writing",
    },
  },
  {
    id: "announcement",
    name: "Announcement",
    summary: "Launch badge, sans headline, emerald baseline. For releases and events.",
    usesDescription: true,
    sample: {
      theme: "dark",
      eyebrow: "Release 1.0",
      title: "Brand components are now open source",
      description: "Tokens, primitives and the Takumi social pipeline in one registry.",
      siteUrl: "github.com/canadian-ai",
    },
  },
]

export function getPreset(id: PresetId): PresetDefinition {
  const preset = PRESETS.find((candidate) => candidate.id === id)
  if (!preset) throw new Error(`Unknown preset: ${id}`)
  return preset
}

export function presetSampleParams(id: PresetId): OgParams {
  return { preset: id, headingFont: DEFAULT_FONTS.heading, bodyFont: DEFAULT_FONTS.body, logo: "brand", ...getPreset(id).sample }
}
