import type { CSSProperties } from "react"
import { LOGO_IMAGE_SRC } from "./assets"
import { CAI_MARK_PATH, MARK_FILL, SOCIAL_ACCENT } from "./brand"
import { OG_HEIGHT, OG_WIDTH, titleFontSize, type LogoMode, type OgParams, type OgTheme } from "./schema"

interface Palette {
  background: string
  foreground: string
  muted: string
  line: string
  panel: string
  mark: string
}

export function paletteFor(theme: OgTheme): Palette {
  if (theme === "light") {
    return {
      background: SOCIAL_ACCENT.pearl,
      foreground: SOCIAL_ACCENT.void,
      muted: SOCIAL_ACCENT.slate,
      line: SOCIAL_ACCENT.zinc,
      panel: SOCIAL_ACCENT.void,
      mark: MARK_FILL.black,
    }
  }
  return {
    background: SOCIAL_ACCENT.void,
    foreground: SOCIAL_ACCENT.pearl,
    muted: SOCIAL_ACCENT.mist,
    line: SOCIAL_ACCENT.slate,
    panel: SOCIAL_ACCENT.slate,
    mark: MARK_FILL.white,
  }
}

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

function Spotlight(params: OgParams) {
  const { title, description, eyebrow, siteUrl, theme, logo } = params
  const p = paletteFor(theme)
  const fonts = fontsFor(params)
  return (
    <div style={{ ...canvas, backgroundColor: p.background, fontFamily: fonts.body }}>
      <Logo
        mode={logo}
        size={360}
        fill={p.foreground}
        style={{ position: "absolute", right: 64, bottom: -96, opacity: 0.05 }}
      />
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 36,
          right: 36,
          bottom: 36,
          border: `1px solid ${p.line}`,
          padding: "52px 72px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, height: 72 }}>
          <Logo mode={logo} size={72} fill={p.mark} />
          <div style={eyebrowStyle(p.muted, fonts.body)}>{eyebrow}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 880 }}>
          <div style={{ width: 64, height: 6, backgroundColor: SOCIAL_ACCENT.emerald }} />
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
            }}
          >
            {title}
          </div>
          {description ? (
            <div style={{ color: p.muted, fontSize: 28, lineHeight: 1.4, maxWidth: 820 }}>{description}</div>
          ) : null}
        </div>
        <div style={{ display: "flex", color: p.muted, fontSize: 22, fontWeight: 500 }}>{siteUrl}</div>
      </div>
    </div>
  )
}

function Split(params: OgParams) {
  const { title, description, eyebrow, siteUrl, theme, logo } = params
  const p = paletteFor(theme)
  const fonts = fontsFor(params)
  return (
    <div style={{ ...canvas, backgroundColor: p.background, fontFamily: fonts.body }}>
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
        <div style={eyebrowStyle(SOCIAL_ACCENT.emerald, fonts.body)}>{eyebrow}</div>
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
            }}
          >
            {title}
          </div>
          {description ? (
            <div style={{ color: p.muted, fontSize: 26, lineHeight: 1.45 }}>{description}</div>
          ) : null}
        </div>
        <div style={{ display: "flex", color: p.muted, fontSize: 22, fontWeight: 500 }}>{siteUrl}</div>
      </div>
      <div style={{ width: 6, height: OG_HEIGHT, backgroundColor: SOCIAL_ACCENT.emerald }} />
      <div
        style={{
          width: OG_WIDTH - 740 - 6,
          height: OG_HEIGHT,
          backgroundColor: p.panel,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Logo mode={logo} size={280} fill={MARK_FILL.white} />
      </div>
    </div>
  )
}

function Statement(params: OgParams) {
  const { title, eyebrow, siteUrl, theme, logo } = params
  const p = paletteFor(theme)
  const fonts = fontsFor(params)
  return (
    <div
      style={{
        ...canvas,
        backgroundColor: p.background,
        fontFamily: fonts.body,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "64px 120px",
      }}
    >
      <div style={eyebrowStyle(SOCIAL_ACCENT.emerald, fonts.body)}>{eyebrow}</div>
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
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, color: p.muted, fontSize: 22 }}>
        <Logo mode={logo} size={32} fill={p.mark} />
        <div>{siteUrl}</div>
      </div>
    </div>
  )
}

function Announcement(params: OgParams) {
  const { title, description, eyebrow, siteUrl, theme, logo } = params
  const p = paletteFor(theme)
  const fonts = fontsFor(params)
  return (
    <div style={{ ...canvas, backgroundColor: p.background, fontFamily: fonts.body, flexDirection: "column" }}>
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
              ...eyebrowStyle(SOCIAL_ACCENT.emerald, fonts.body),
              fontSize: 20,
              border: `2px solid ${SOCIAL_ACCENT.emerald}`,
              padding: "8px 16px",
            }}
          >
            New
          </div>
          <div style={eyebrowStyle(p.muted, fonts.body)}>{eyebrow}</div>
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
            }}
          >
            {title}
          </div>
          {description ? (
            <div style={{ color: p.muted, fontSize: 28, lineHeight: 1.4, maxWidth: 900 }}>{description}</div>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: p.muted, fontSize: 22 }}>
          <Logo mode={logo} size={36} fill={p.mark} />
          <div>{siteUrl}</div>
        </div>
      </div>
      <div style={{ width: OG_WIDTH, height: 12, backgroundColor: SOCIAL_ACCENT.emerald }} />
    </div>
  )
}

const TEMPLATES = {
  spotlight: Spotlight,
  split: Split,
  statement: Statement,
  announcement: Announcement,
} as const

export function OgTemplate(params: OgParams) {
  const Template = TEMPLATES[params.preset]
  return <Template {...params} />
}
