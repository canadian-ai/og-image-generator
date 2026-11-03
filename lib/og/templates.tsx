import type { CSSProperties } from "react"
import { LOGO_IMAGE_SRC } from "./assets"
import { CAI_MARK_PATH } from "./brand"
import { OG_HEIGHT, OG_WIDTH, titleFontSize, type LogoMode, type OgParams } from "./schema"
import { paletteFor } from "./themes"

/**
 * A card is drawn as one static plate plus parts that the video animates. Rendering a single
 * layer keeps the whole layout and hides everything else, so the layers stack back into the still.
 */
export const PART_LAYERS = ["logo", "eyebrow", "title", "description", "siteUrl"] as const
export type PartLayer = (typeof PART_LAYERS)[number]
export type OgLayer = "plate" | PartLayer

const shows = (layer: OgLayer | undefined, id: OgLayer) => layer === undefined || layer === id
const hide = (layer: OgLayer | undefined, id: OgLayer): CSSProperties => (shows(layer, id) ? {} : { opacity: 0 })
const ink = (layer: OgLayer | undefined, id: OgLayer, color: string) => (shows(layer, id) ? color : "transparent")

interface LogoProps {
  mode: LogoMode
  size: number
  fill: string
  style?: CSSProperties
}

/** The Canadian AI mark, the uploaded logo (resolved by Takumi from `images`), or nothing. */
function Logo({ mode, size, fill, style }: LogoProps) {
  if (mode === "none") return null
  if (mode === "custom") {
    return <img src={LOGO_IMAGE_SRC} width={size} height={size} style={{ objectFit: "contain", ...style }} alt="" />
  }
  return (
    <svg width={size} height={size} viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg" style={style}>
      <path fill={fill} d={CAI_MARK_PATH} />
    </svg>
  )
}

function fontStack(family: string, generic: "serif" | "sans-serif") {
  return `"${family}", ${generic}`
}

function fontsFor(params: OgParams) {
  return { heading: fontStack(params.headingFont, "serif"), body: fontStack(params.bodyFont, "sans-serif") }
}

const canvas: CSSProperties = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
  display: "flex",
  position: "relative",
  overflow: "hidden",
}

const eyebrowStyle = (color: string, fontFamily: string): CSSProperties => ({
  color,
  fontFamily,
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
})

type TemplateProps = OgParams & { layer?: OgLayer }

function Spotlight(params: TemplateProps) {
  const { title, description, eyebrow, siteUrl, theme, logo, layer } = params
  const p = paletteFor(theme, params.customColors)
  const fonts = fontsFor(params)
  return (
    <div style={{ ...canvas, backgroundColor: ink(layer, "plate", p.background), fontFamily: fonts.body }}>
      <Logo
        mode={logo}
        size={360}
        fill={p.foreground}
        style={{ position: "absolute", right: 64, bottom: -96, opacity: shows(layer, "plate") ? 0.05 : 0 }}
      />
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 36,
          right: 36,
          bottom: 36,
          border: `1px solid ${ink(layer, "plate", p.line)}`,
          padding: "52px 72px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, height: 72 }}>
          <Logo mode={logo} size={72} fill={p.mark} style={hide(layer, "logo")} />
          <div style={{ ...eyebrowStyle(p.muted, fonts.body), ...hide(layer, "eyebrow") }}>{eyebrow}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 880 }}>
          <div style={{ width: 64, height: 6, backgroundColor: ink(layer, "plate", p.accent) }} />
          <div
            style={{
              color: p.foreground,
              fontFamily: fonts.heading,
              fontWeight: 700,
              fontSize: titleFontSize(title),
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              textWrap: "balance",
              overflowWrap: "anywhere",
              ...hide(layer, "title"),
            }}
          >
            {title}
          </div>
          {description ? (
            <div
              style={{
                color: p.muted,
                fontSize: 28,
                lineHeight: 1.4,
                maxWidth: 820,
                ...hide(layer, "description"),
              }}
            >
              {description}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", color: p.muted, fontSize: 22, fontWeight: 500, ...hide(layer, "siteUrl") }}>
          {siteUrl}
        </div>
      </div>
    </div>
  )
}

function Split(params: TemplateProps) {
  const { title, description, eyebrow, siteUrl, theme, logo, layer } = params
  const p = paletteFor(theme, params.customColors)
  const fonts = fontsFor(params)
  return (
    <div style={{ ...canvas, backgroundColor: ink(layer, "plate", p.background), fontFamily: fonts.body }}>
      <div
        style={{
          width: 740,
          height: OG_HEIGHT,
          padding: "72px 64px 64px 80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ ...eyebrowStyle(p.accent, fonts.body), ...hide(layer, "eyebrow") }}>{eyebrow}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              color: p.foreground,
              fontFamily: fonts.heading,
              fontWeight: 700,
              fontSize: titleFontSize(title, 76),
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              textWrap: "balance",
              overflowWrap: "anywhere",
              ...hide(layer, "title"),
            }}
          >
            {title}
          </div>
          {description ? (
            <div style={{ color: p.muted, fontSize: 26, lineHeight: 1.45, ...hide(layer, "description") }}>
              {description}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", color: p.muted, fontSize: 22, fontWeight: 500, ...hide(layer, "siteUrl") }}>
          {siteUrl}
        </div>
      </div>
      <div style={{ width: 6, height: OG_HEIGHT, backgroundColor: ink(layer, "plate", p.accent) }} />
      <div
        style={{
          width: OG_WIDTH - 740 - 6,
          height: OG_HEIGHT,
          backgroundColor: ink(layer, "plate", p.panel),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Logo mode={logo} size={280} fill={p.panelMark} style={hide(layer, "logo")} />
      </div>
    </div>
  )
}

function Statement(params: TemplateProps) {
  const { title, eyebrow, siteUrl, theme, logo, layer } = params
  const p = paletteFor(theme, params.customColors)
  const fonts = fontsFor(params)
  return (
    <div
      style={{
        ...canvas,
        backgroundColor: ink(layer, "plate", p.background),
        fontFamily: fonts.body,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "64px 120px",
      }}
    >
      <div style={{ ...eyebrowStyle(p.accent, fonts.body), ...hide(layer, "eyebrow") }}>{eyebrow}</div>
      <div
        style={{
          color: p.foreground,
          fontFamily: fonts.heading,
          fontWeight: 700,
          fontSize: titleFontSize(title, 96),
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          textAlign: "center",
          textWrap: "balance",
          overflowWrap: "anywhere",
          ...hide(layer, "title"),
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, color: p.muted, fontSize: 22 }}>
        <Logo mode={logo} size={32} fill={p.mark} style={hide(layer, "logo")} />
        <div style={hide(layer, "siteUrl")}>{siteUrl}</div>
      </div>
    </div>
  )
}

function Announcement(params: TemplateProps) {
  const { title, description, eyebrow, siteUrl, theme, logo, layer } = params
  const p = paletteFor(theme, params.customColors)
  const fonts = fontsFor(params)
  return (
    <div
      style={{
        ...canvas,
        backgroundColor: ink(layer, "plate", p.background),
        fontFamily: fonts.body,
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flexGrow: 1,
          padding: "72px 80px 56px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              ...eyebrowStyle(p.accent, fonts.body),
              fontSize: 20,
              border: `2px solid ${ink(layer, "eyebrow", p.accent)}`,
              padding: "8px 16px",
              ...hide(layer, "eyebrow"),
            }}
          >
            New
          </div>
          <div style={{ ...eyebrowStyle(p.muted, fonts.body), ...hide(layer, "eyebrow") }}>{eyebrow}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1000 }}>
          <div
            style={{
              color: p.foreground,
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: titleFontSize(title, 84),
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              textWrap: "balance",
              overflowWrap: "anywhere",
              ...hide(layer, "title"),
            }}
          >
            {title}
          </div>
          {description ? (
            <div
              style={{
                color: p.muted,
                fontSize: 28,
                lineHeight: 1.4,
                maxWidth: 900,
                ...hide(layer, "description"),
              }}
            >
              {description}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: p.muted, fontSize: 22 }}>
          <Logo mode={logo} size={36} fill={p.mark} style={hide(layer, "logo")} />
          <div style={hide(layer, "siteUrl")}>{siteUrl}</div>
        </div>
      </div>
      <div style={{ width: OG_WIDTH, height: 12, backgroundColor: ink(layer, "plate", p.accent) }} />
    </div>
  )
}

const TEMPLATES = {
  spotlight: Spotlight,
  split: Split,
  statement: Statement,
  announcement: Announcement,
} as const

export function OgTemplate(params: TemplateProps) {
  const Template = TEMPLATES[params.preset]
  return <Template {...params} />
}
