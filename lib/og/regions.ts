import { OG_HEIGHT, OG_WIDTH, titleFontSize, type OgParams, type PresetId } from "./schema"

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const FOCUS_TARGETS = [
  "eyebrow",
  "title",
  "description",
  "siteUrl",
  "logo",
  "theme",
  "headingFont",
  "bodyFont",
] as const
export type FocusTarget = (typeof FOCUS_TARGETS)[number]

export const FOCUS_LABELS: Record<FocusTarget, string> = {
  eyebrow: "Eyebrow",
  title: "Title",
  description: "Description",
  siteUrl: "Site",
  logo: "Logo",
  theme: "Theme",
  headingFont: "Heading font",
  bodyFont: "Body font",
}

export function isFocusTarget(value: string | undefined): value is FocusTarget {
  return (FOCUS_TARGETS as readonly string[]).includes(value ?? "")
}

export interface FocusInfo {
  rects: Rect[]
  /** Explains why nothing is highlighted, e.g. the preset hides that element. */
  note?: string
}

interface Layout {
  eyebrow: Rect
  title: Rect
  description: Rect | null
  siteUrl: Rect
  logo: Rect | null
}

const CANVAS: Rect = { x: 0, y: 0, w: OG_WIDTH, h: OG_HEIGHT }

/*
 * Takumi has no layout-measurement API, so boxes are derived from the same numbers the
 * templates use plus an average glyph width. They are guides for the eye, not hit tests.
 */
const HEADING_GLYPH = 0.54
const BODY_GLYPH = 0.5
const LINE_EYEBROW = 27
const LINE_FOOTER = 28

function textWidth(text: string, size: number, glyph: number, tracking = 0): number {
  return Math.ceil(text.length * (size * glyph + tracking))
}

function wrapped(text: string, size: number, maxWidth: number, glyph: number) {
  const total = textWidth(text, size, glyph)
  const lines = Math.max(1, Math.ceil(total / maxWidth))
  const width = lines === 1 ? total : Math.min(maxWidth, Math.ceil((total / lines) * 1.1))
  return { lines, width: Math.max(width, size) }
}

function eyebrowWidth(eyebrow: string): number {
  return textWidth(eyebrow, 22, 0.62, 2.64)
}

/** Space left over when stacking fixed children with `justify-content: space-between`. */
function betweenGap(total: number, ...sizes: number[]): number {
  const free = total - sizes.reduce((sum, size) => sum + size, 0)
  return Math.max(0, free / (sizes.length - 1))
}

function spotlight(params: OgParams): Layout {
  const { title, description, eyebrow, siteUrl } = params
  const left = 109
  const top = 89
  const bottom = 541
  const size = titleFontSize(title)
  const t = wrapped(title, size, 880, HEADING_GLYPH)
  const titleHeight = t.lines * size * 1.04
  const d = description ? wrapped(description, 28, 820, BODY_GLYPH) : null
  const descriptionHeight = d ? d.lines * 28 * 1.4 : 0
  const block = 6 + 22 + titleHeight + (d ? 22 + descriptionHeight : 0)
  const gap = betweenGap(bottom - top, 72, block, LINE_FOOTER)
  const titleY = top + 72 + gap + 28
  return {
    eyebrow: { x: left + 96, y: top + (72 - LINE_EYEBROW) / 2, w: eyebrowWidth(eyebrow), h: LINE_EYEBROW },
    title: { x: left, y: titleY, w: t.width, h: titleHeight },
    description: d ? { x: left, y: titleY + titleHeight + 22, w: d.width, h: descriptionHeight } : null,
    siteUrl: { x: left, y: bottom - LINE_FOOTER, w: textWidth(siteUrl, 22, BODY_GLYPH), h: LINE_FOOTER },
    logo: { x: left, y: top, w: 72, h: 72 },
  }
}

function split(params: OgParams): Layout {
  const { title, description, eyebrow, siteUrl } = params
  const left = 80
  const top = 72
  const bottom = 566
  const width = 596
  const size = titleFontSize(title, 76)
  const t = wrapped(title, size, width, HEADING_GLYPH)
  const titleHeight = t.lines * size * 1.06
  const d = description ? wrapped(description, 26, width, BODY_GLYPH) : null
  const descriptionHeight = d ? d.lines * 26 * 1.45 : 0
  const block = titleHeight + (d ? 24 + descriptionHeight : 0)
  const gap = betweenGap(bottom - top, LINE_EYEBROW, block, LINE_FOOTER)
  const titleY = top + LINE_EYEBROW + gap
  return {
    eyebrow: { x: left, y: top, w: eyebrowWidth(eyebrow), h: LINE_EYEBROW },
    title: { x: left, y: titleY, w: t.width, h: titleHeight },
    description: d ? { x: left, y: titleY + titleHeight + 24, w: d.width, h: descriptionHeight } : null,
    siteUrl: { x: left, y: bottom - LINE_FOOTER, w: textWidth(siteUrl, 22, BODY_GLYPH), h: LINE_FOOTER },
    logo: { x: 833, y: 175, w: 280, h: 280 },
  }
}

function statement(params: OgParams): Layout {
  const { title, eyebrow, siteUrl } = params
  const top = 64
  const bottom = 566
  const size = titleFontSize(title, 96)
  const t = wrapped(title, size, 960, HEADING_GLYPH)
  const titleHeight = t.lines * size * 1.05
  const footerHeight = 32
  const gap = betweenGap(bottom - top, LINE_EYEBROW, titleHeight, footerHeight)
  const eyebrowW = eyebrowWidth(eyebrow)
  const siteW = textWidth(siteUrl, 22, BODY_GLYPH)
  const footerX = OG_WIDTH / 2 - (footerHeight + 16 + siteW) / 2
  return {
    eyebrow: { x: OG_WIDTH / 2 - eyebrowW / 2, y: top, w: eyebrowW, h: LINE_EYEBROW },
    title: { x: OG_WIDTH / 2 - t.width / 2, y: top + LINE_EYEBROW + gap, w: t.width, h: titleHeight },
    description: null,
    siteUrl: { x: footerX + footerHeight + 16, y: bottom - footerHeight + 2, w: siteW, h: LINE_EYEBROW },
    logo: { x: footerX, y: bottom - footerHeight, w: footerHeight, h: footerHeight },
  }
}

function announcement(params: OgParams): Layout {
  const { title, description, eyebrow, siteUrl } = params
  const left = 80
  const top = 72
  const bottom = 562
  const headerHeight = 44
  const footerHeight = 36
  const badgeWidth = textWidth("NEW", 20, 0.62, 2.4) + 36
  const size = titleFontSize(title, 84)
  const t = wrapped(title, size, 1000, BODY_GLYPH)
  const titleHeight = t.lines * size * 1.05
  const d = description ? wrapped(description, 28, 900, BODY_GLYPH) : null
  const descriptionHeight = d ? d.lines * 28 * 1.4 : 0
  const block = titleHeight + (d ? 24 + descriptionHeight : 0)
  const gap = betweenGap(bottom - top, headerHeight, block, footerHeight)
  const titleY = top + headerHeight + gap
  return {
    eyebrow: { x: left + badgeWidth + 20, y: top + (headerHeight - LINE_EYEBROW) / 2, w: eyebrowWidth(eyebrow), h: LINE_EYEBROW },
    title: { x: left, y: titleY, w: t.width, h: titleHeight },
    description: d ? { x: left, y: titleY + titleHeight + 24, w: d.width, h: descriptionHeight } : null,
    siteUrl: { x: left + footerHeight + 16, y: bottom - footerHeight + 4, w: textWidth(siteUrl, 22, BODY_GLYPH), h: LINE_EYEBROW },
    logo: { x: left, y: bottom - footerHeight, w: footerHeight, h: footerHeight },
  }
}

const LAYOUTS: Record<PresetId, (params: OgParams) => Layout> = { spotlight, split, statement, announcement }

const PRESET_NAMES: Record<PresetId, string> = {
  spotlight: "Spotlight",
  split: "Split",
  statement: "Statement",
  announcement: "Announcement",
}

/** Which part of the 1200x630 card an input controls, in canvas pixels. */
export function focusInfo(params: OgParams, target: FocusTarget): FocusInfo {
  const layout = LAYOUTS[params.preset](params)
  const presetName = PRESET_NAMES[params.preset]

  switch (target) {
    case "eyebrow":
    case "title":
    case "siteUrl":
      return { rects: [layout[target]] }
    case "description":
      if (params.preset === "statement") return { rects: [], note: `${presetName} doesn't show a description.` }
      return layout.description ? { rects: [layout.description] } : { rects: [], note: "Add a description to see it here." }
    case "logo":
      if (params.logo === "none") return { rects: [], note: "The logo is turned off." }
      return layout.logo ? { rects: [layout.logo] } : { rects: [] }
    case "theme":
      return { rects: [CANVAS] }
    case "headingFont":
      if (params.preset === "announcement") {
        return { rects: [], note: "Announcement sets its title in the body font." }
      }
      return { rects: [layout.title] }
    case "bodyFont": {
      const rects = [layout.eyebrow, layout.siteUrl]
      if (layout.description) rects.push(layout.description)
      if (params.preset === "announcement") rects.push(layout.title)
      return { rects }
    }
  }
}
