import { presetSampleParams } from "@/lib/og/presets"
import { renderOgPng } from "@/lib/og/render"
import { OG_HEIGHT, OG_WIDTH } from "@/lib/og/schema"

// Prerendered once at build; user cards are rendered in the browser.
export const dynamic = "force-static"
export const alt = "OG Image Generator by Canadian AI"
export const size = { width: OG_WIDTH, height: OG_HEIGHT }
export const contentType = "image/png"

export default async function OpenGraphImage() {
  const png = await renderOgPng({
    ...presetSampleParams("spotlight"),
    title: "OG Image Generator",
    description: "On-brand 1200x630 cards, rendered in your browser and shipped as a pull request.",
  })
  return new Response(png as BlobPart, { headers: { "Content-Type": contentType } })
}
