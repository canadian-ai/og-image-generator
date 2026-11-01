import { describe, expect, it } from "vitest"
import { PRESETS, presetSampleParams } from "@/lib/og/presets"
import { FOCUS_LABELS, FOCUS_TARGETS, focusInfo, isFocusTarget, type Rect } from "@/lib/og/regions"
import { OG_HEIGHT, OG_WIDTH } from "@/lib/og/schema"

function inside(rect: Rect): boolean {
  return rect.w > 0 && rect.h > 0 && rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= OG_WIDTH && rect.y + rect.h <= OG_HEIGHT
}

describe("focus targets", () => {
  it("labels every target and recognises only known ones", () => {
    for (const target of FOCUS_TARGETS) {
      expect(FOCUS_LABELS[target]).toBeTruthy()
      expect(isFocusTarget(target)).toBe(true)
    }
    expect(isFocusTarget("nope")).toBe(false)
    expect(isFocusTarget(undefined)).toBe(false)
  })
})

describe("focusInfo", () => {
  for (const preset of PRESETS) {
    it(`keeps every highlight on the canvas for the ${preset.id} preset`, () => {
      const params = presetSampleParams(preset.id)
      for (const target of FOCUS_TARGETS) {
        const info = focusInfo(params, target)
        for (const rect of info.rects) expect(inside(rect), `${preset.id}/${target}`).toBe(true)
        if (info.rects.length === 0) expect(info.note, `${preset.id}/${target} needs a reason`).toBeTruthy()
      }
    })
  }

  it("highlights the title and gives a longer title a taller box", () => {
    const base = presetSampleParams("spotlight")
    const short = focusInfo({ ...base, title: "Short" }, "title").rects[0]
    const long = focusInfo({ ...base, title: "A much longer headline that has to wrap across several lines of the card" }, "title").rects[0]
    expect(short).toBeDefined()
    expect(long.h).toBeGreaterThanOrEqual(short.h)
  })

  it("covers the whole card for theme, since it recolours everything", () => {
    const [rect] = focusInfo(presetSampleParams("spotlight"), "theme").rects
    expect(rect).toEqual({ x: 0, y: 0, w: OG_WIDTH, h: OG_HEIGHT })
  })

  it("explains why a hidden description has no highlight", () => {
    const params = { ...presetSampleParams("spotlight"), description: "" }
    const info = focusInfo(params, "description")
    expect(info.rects).toEqual([])
    expect(info.note).toBeTruthy()
  })
})
