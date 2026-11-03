import type { OgAssets } from "../assets"
import { renderInBrowser } from "../client-renderer"
import { OG_HEIGHT, OG_WIDTH, type OgParams } from "../schema"
import type { PartLayer } from "../templates"
import { alphaBounds, padRect, type Rect } from "./bounds"
import { PART_ORDER, partPose, partProgress } from "./timeline"

/** Room around a part's pixels for blur and the logo's overshoot. */
const PART_PADDING = 24

/** Parts that are revealed through a window rather than faded in place. */
const CLIPPED_PARTS: ReadonlySet<PartLayer> = new Set(["eyebrow", "title"])

export interface ScenePart {
  bitmap: ImageBitmap
  /** Padded box of the part's pixels, or null when the part is switched off. */
  bounds: Rect | null
}

export interface VideoScene {
  plate: ImageBitmap
  parts: Record<PartLayer, ScenePart>
}

function toBitmap(png: Uint8Array): Promise<ImageBitmap> {
  return createImageBitmap(new Blob([png as BlobPart], { type: "image/png" }))
}

function measure(bitmap: ImageBitmap): Rect | null {
  const canvas = document.createElement("canvas")
  canvas.width = OG_WIDTH
  canvas.height = OG_HEIGHT
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0)
  const { data } = ctx.getImageData(0, 0, OG_WIDTH, OG_HEIGHT)
  const bounds = alphaBounds(data, OG_WIDTH, OG_HEIGHT)
  return bounds ? padRect(bounds, PART_PADDING, OG_WIDTH, OG_HEIGHT) : null
}

/** Renders the static plate and every animatable part as transparent layers with the same Takumi pipeline as the still. */
export async function buildVideoScene(params: OgParams, assets: OgAssets): Promise<VideoScene> {
  const [plate, ...parts] = await Promise.all([
    renderInBrowser(params, assets, "plate").then(toBitmap),
    ...PART_ORDER.map((part) => renderInBrowser(params, assets, part).then(toBitmap)),
  ])
  const entries = PART_ORDER.map((part, index) => [part, { bitmap: parts[index], bounds: measure(parts[index]) }] as const)
  return { plate, parts: Object.fromEntries(entries) as Record<PartLayer, ScenePart> }
}

/** Draws the card at time `t` seconds. Pure in `t`, so preview scrubbing and export agree frame for frame. */
export function drawFrame(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, scene: VideoScene, t: number) {
  ctx.clearRect(0, 0, OG_WIDTH, OG_HEIGHT)
  ctx.drawImage(scene.plate, 0, 0)

  for (const part of PART_ORDER) {
    const { bitmap, bounds } = scene.parts[part]
    if (!bounds) continue

    const progress = partProgress(part, t)
    if (progress === 1) {
      ctx.drawImage(bitmap, 0, 0)
      continue
    }

    const pose = partPose(part, progress, bounds)
    if (pose.alpha <= 0.001 || pose.scale <= 0) continue

    ctx.save()
    if (CLIPPED_PARTS.has(part)) {
      ctx.beginPath()
      ctx.rect(pose.clip.x, pose.clip.y, pose.clip.width, pose.clip.height)
      ctx.clip()
    }
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    ctx.translate(centerX + pose.translateX, centerY + pose.translateY)
    ctx.rotate(pose.rotate)
    ctx.scale(pose.scale, pose.scale)
    ctx.globalAlpha = Math.min(1, pose.alpha)
    if (pose.blur > 0.1) ctx.filter = `blur(${pose.blur}px)`
    ctx.drawImage(bitmap, -centerX, -centerY)
    ctx.restore()
  }
}
