import type { PartLayer } from "../templates"
import type { Rect } from "./bounds"

/** Frame 0 is the finished card, so the first frame doubles as the still. */
export const VIDEO_FPS = 60
export const VIDEO_DURATION = 4
export const VIDEO_FRAME_COUNT = VIDEO_FPS * VIDEO_DURATION

/** Draw order, back to front, and the order the parts rebuild in. */
export const PART_ORDER: readonly PartLayer[] = ["logo", "eyebrow", "title", "description", "siteUrl"]

const HOLD_START = 0.5
const EXIT_DURATION = 0.35
const EXIT_STAGGER = 0.05
const ENTER_START = 1.1
const ENTER_STAGGER = 0.12
const ENTER_DURATION = 0.9

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const easeInCubic = (t: number) => t * t * t
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
const easeOutQuint = (t: number) => 1 - (1 - t) ** 5
const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

type Easing = (t: number) => number

const EASING: Record<PartLayer, Easing> = {
  logo: easeOutBack,
  eyebrow: easeOutCubic,
  title: easeOutQuint,
  description: easeOutCubic,
  siteUrl: easeOutCubic,
}

/**
 * How built a part is at time `t`: 1 when settled, 0 when hidden. The parts leave in reverse
 * order, the plate sits empty for a beat, then they spring back in. `logo` may overshoot 1.
 */
export function partProgress(part: PartLayer, t: number): number {
  const index = PART_ORDER.indexOf(part)
  const exitStart = HOLD_START + (PART_ORDER.length - 1 - index) * EXIT_STAGGER
  const enterStart = ENTER_START + index * ENTER_STAGGER

  if (t < exitStart) return 1
  if (t < exitStart + EXIT_DURATION) return 1 - easeInCubic((t - exitStart) / EXIT_DURATION)
  if (t < enterStart) return 0
  if (t < enterStart + ENTER_DURATION) return EASING[part]((t - enterStart) / ENTER_DURATION)
  return 1
}

export interface PartPose {
  /** Clip window in canvas pixels, so a moving part never draws outside its own box. */
  clip: Rect
  translateX: number
  translateY: number
  scale: number
  rotate: number
  alpha: number
  blur: number
}

/** The transform for a part at progress `p` (see `partProgress`). Pure and deterministic. */
export function partPose(part: PartLayer, p: number, bounds: Rect): PartPose {
  const rest: PartPose = { clip: bounds, translateX: 0, translateY: 0, scale: 1, rotate: 0, alpha: 1, blur: 0 }
  const open = clamp01(p)

  switch (part) {
    case "logo":
      return { ...rest, scale: 0.55 + 0.45 * p, rotate: (p - 1) * 0.6, alpha: clamp01(p * 2.5) }
    case "eyebrow":
      return {
        ...rest,
        clip: { ...bounds, width: Math.max(0, bounds.width * open) },
        translateX: (open - 1) * 14,
        alpha: clamp01(open * 3),
      }
    case "title":
      return { ...rest, translateY: (1 - open) * bounds.height * 0.9, alpha: clamp01(open * 4) }
    case "description":
      return { ...rest, translateY: (1 - open) * 18, alpha: open, blur: (1 - open) * 8 }
    case "siteUrl":
      return { ...rest, translateY: (1 - open) * 10, alpha: open }
  }
}
