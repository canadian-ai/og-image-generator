import { describe, expect, it } from "vitest"
import { presetSampleParams } from "@/lib/og/presets"
import { renderOgPng } from "@/lib/og/render"
import { OG_HEIGHT, OG_WIDTH, PRESET_IDS } from "@/lib/og/schema"
import { PART_LAYERS, type OgLayer } from "@/lib/og/templates"
import { alphaBounds, padRect } from "@/lib/og/video/bounds"
import {
  PART_ORDER,
  VIDEO_DURATION,
  VIDEO_FPS,
  VIDEO_FRAME_COUNT,
  partPose,
  partProgress,
} from "@/lib/og/video/timeline"
import { compositeOver, decodePng, meanColorDiff } from "./helpers/png"

describe("alphaBounds", () => {
  it("finds the box around opaque pixels and reports empty layers as null", () => {
    const width = 10
    const height = 6
    const rgba = new Uint8Array(width * height * 4)
    expect(alphaBounds(rgba, width, height)).toBeNull()
    for (const [x, y] of [
      [2, 1],
      [6, 4],
    ]) {
      rgba[(y * width + x) * 4 + 3] = 255
    }
    expect(alphaBounds(rgba, width, height)).toEqual({ x: 2, y: 1, width: 5, height: 4 })
  })

  it("pads a rect without leaving the canvas", () => {
    expect(padRect({ x: 2, y: 3, width: 10, height: 10 }, 6, 20, 20)).toEqual({ x: 0, y: 0, width: 18, height: 19 })
  })
})

describe("video timeline", () => {
  it("is 60fps over four seconds", () => {
    expect(VIDEO_FPS).toBe(60)
    expect(VIDEO_DURATION).toBe(4)
    expect(VIDEO_FRAME_COUNT).toBe(240)
  })

  it("starts and ends on the finished card so it loops cleanly", () => {
    for (const part of PART_ORDER) {
      expect(partProgress(part, 0)).toBe(1)
      expect(partProgress(part, VIDEO_DURATION)).toBe(1)
    }
  })

  it("empties every part at some point in the middle", () => {
    const hiddenAt = (t: number) => PART_ORDER.every((part) => partProgress(part, t) === 0)
    expect(hiddenAt(1.07)).toBe(true)
  })

  it("is deterministic and stays within a sane range", () => {
    for (const part of PART_ORDER) {
      for (let frame = 0; frame <= VIDEO_FRAME_COUNT; frame++) {
        const t = frame / VIDEO_FPS
        const p = partProgress(part, t)
        expect(partProgress(part, t)).toBe(p)
        expect(p).toBeGreaterThanOrEqual(0)
        expect(p).toBeLessThanOrEqual(1.12)
      }
    }
  })

  it("leaves each part exactly in place when settled", () => {
    const bounds = { x: 10, y: 20, width: 300, height: 80 }
    for (const part of PART_ORDER) {
      expect(partPose(part, 1, bounds)).toEqual({
        clip: bounds,
        translateX: 0,
        translateY: 0,
        scale: 1,
        rotate: 0,
        alpha: 1,
        blur: 0,
      })
    }
  })

  it("rebuilds parts in order, logo first and URL last", () => {
    const t = 1.3
    const progress = PART_ORDER.map((part) => partProgress(part, t))
    for (let i = 1; i < progress.length; i++) expect(progress[i - 1]).toBeGreaterThanOrEqual(progress[i])
  })
})

describe("layered templates", () => {
  it.each(PRESET_IDS)("the %s layers stack back into the still", async (preset) => {
    const params = presetSampleParams(preset)
    const still = decodePng(await renderOgPng(params))
    const layers: OgLayer[] = ["plate", ...PART_LAYERS]

    let stacked: Uint8Array | null = null
    for (const layer of layers) {
      const image = decodePng(await renderOgPng(params, { layer }))
      expect(image.width).toBe(OG_WIDTH)
      expect(image.height).toBe(OG_HEIGHT)
      stacked = stacked ? compositeOver(stacked, image.data) : image.data
    }

    expect(meanColorDiff(stacked as Uint8Array, still.data)).toBeLessThan(1.5)
  })

  it("renders each part on a transparent canvas with a box of its own", async () => {
    const params = presetSampleParams("spotlight")
    const boxes = new Map<OgLayer, ReturnType<typeof alphaBounds>>()
    for (const layer of PART_LAYERS) {
      const image = decodePng(await renderOgPng(params, { layer }))
      expect(image.data[3]).toBe(0)
      boxes.set(layer, alphaBounds(image.data, image.width, image.height))
    }
    for (const layer of PART_LAYERS) expect(boxes.get(layer)).not.toBeNull()

    const title = boxes.get("title")
    const siteUrl = boxes.get("siteUrl")
    expect(title && siteUrl && title.y + title.height < siteUrl.y).toBe(true)
  })

  it("the plate holds no text or logo", async () => {
    const params = presetSampleParams("statement")
    const plate = decodePng(await renderOgPng(params, { layer: "plate" }))
    const withText = decodePng(await renderOgPng(params))
    expect(meanColorDiff(plate.data, withText.data)).toBeGreaterThan(0.2)
    const flat = new Set<number>()
    for (let i = 0; i < plate.data.length; i += 4) flat.add(plate.data[i] * 65536 + plate.data[i + 1] * 256 + plate.data[i + 2])
    expect(flat.size).toBe(1)
  })

  it("reports no box for a part that is switched off", async () => {
    const params = { ...presetSampleParams("statement"), logo: "none" as const }
    const image = decodePng(await renderOgPng(params, { layer: "logo" }))
    expect(alphaBounds(image.data, image.width, image.height)).toBeNull()
  })
})
