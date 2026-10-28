/** Assets that never leave the browser tab: uploaded font files and the uploaded logo. */

export const LOGO_IMAGE_SRC = "custom-logo"

export const FONT_EXTENSIONS = [".ttf", ".otf", ".woff", ".woff2"] as const
export const LOGO_TYPES = ["image/svg+xml", "image/png", "image/jpeg", "image/webp"] as const
export const MAX_FONT_BYTES = 5 * 1024 * 1024
export const MAX_LOGO_BYTES = 1024 * 1024

export interface UploadedFont {
  name: string
  fileName: string
  data: Uint8Array
}

export interface UploadedLogo {
  fileName: string
  type: (typeof LOGO_TYPES)[number]
  data: Uint8Array
}

export interface OgAssets {
  fonts: UploadedFont[]
  logo: UploadedLogo | null
}

export const EMPTY_ASSETS: OgAssets = { fonts: [], logo: null }

/** Turns "acme-sans_bold.woff2" into "Acme Sans Bold". */
export function familyNameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim()
  const name = base.replace(/\s+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  return name.slice(0, 64) || "Custom Font"
}

export function validateFontFile(file: { name: string; size: number }): string | null {
  const lower = file.name.toLowerCase()
  if (!FONT_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
    return "Use a .ttf, .otf, .woff or .woff2 file."
  }
  if (file.size > MAX_FONT_BYTES) return "Font files must be 5 MB or smaller."
  return null
}

export function validateLogoFile(file: { type: string; size: number }): string | null {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return "Use an SVG, PNG, JPEG or WebP image."
  if (file.size > MAX_LOGO_BYTES) return "Logos must be 1 MB or smaller."
  return null
}

const FONT_SIGNATURES: readonly number[][] = [
  [0x00, 0x01, 0x00, 0x00], // TrueType
  [0x4f, 0x54, 0x54, 0x4f], // OTTO
  [0x77, 0x4f, 0x46, 0x46], // wOFF
  [0x77, 0x4f, 0x46, 0x32], // wOF2
  [0x74, 0x72, 0x75, 0x65], // true (legacy Mac TrueType)
]

/** Checks magic bytes so a renamed non-font is rejected before Takumi sees it. */
export function looksLikeFont(bytes: Uint8Array): boolean {
  return FONT_SIGNATURES.some((signature) => signature.every((byte, index) => bytes[index] === byte))
}

/** Stable, cheap fingerprint so render caches change when uploaded bytes change. */
export function assetsKey(assets: OgAssets): string {
  const fonts = assets.fonts.map((font) => `${font.name}:${font.data.byteLength}:${sample(font.data)}`).join("|")
  const logo = assets.logo ? `${assets.logo.type}:${assets.logo.data.byteLength}:${sample(assets.logo.data)}` : "none"
  return `${fonts}#${logo}`
}

function sample(bytes: Uint8Array): number {
  let hash = 2166136261
  const step = Math.max(1, Math.floor(bytes.length / 512))
  for (let index = 0; index < bytes.length; index += step) {
    hash = Math.imul(hash ^ bytes[index], 16777619)
  }
  return hash >>> 0
}
