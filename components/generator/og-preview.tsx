"use client"

import { Download, Link2 } from "lucide-react"
import { useMemo, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FOCUS_LABELS, focusInfo, type FocusInfo, type FocusTarget, type Rect } from "@/lib/og/regions"
import { OG_HEIGHT, OG_WIDTH, type OgParams } from "@/lib/og/schema"

type View = "canvas" | "unfurl"

interface OgPreviewProps {
  params: OgParams
  imageUrl: string | undefined
  isRendering: boolean
  isCurrent: boolean
  error: string | undefined
  isStale: boolean
  /** The input being edited, highlighted on the card. */
  focus: FocusTarget | null
}

const HIGHLIGHT_PADDING = 10

/** Converts a canvas-pixel rectangle into percentage CSS so it scales with the image. */
function toBox(rect: Rect) {
  const x = Math.max(0, rect.x - HIGHLIGHT_PADDING)
  const y = Math.max(0, rect.y - HIGHLIGHT_PADDING)
  const right = Math.min(OG_WIDTH, rect.x + rect.w + HIGHLIGHT_PADDING)
  const bottom = Math.min(OG_HEIGHT, rect.y + rect.h + HIGHLIGHT_PADDING)
  return {
    left: `${(x / OG_WIDTH) * 100}%`,
    top: `${(y / OG_HEIGHT) * 100}%`,
    width: `${((right - x) / OG_WIDTH) * 100}%`,
    height: `${((bottom - y) / OG_HEIGHT) * 100}%`,
  }
}

function downloadName(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
  return `og-${slug || "image"}.png`
}

export function OgPreview({ params, imageUrl, isRendering, isCurrent, error, isStale, focus }: OgPreviewProps) {
  const [view, setView] = useState<View>("canvas")
  const highlight = useMemo(() => (focus ? focusInfo(params, focus) : { rects: [] as Rect[] }) as FocusInfo, [params, focus])
  const dimmed = isStale || !isCurrent
  const status = error
    ? `Render failed: ${error}`
    : isStale
      ? "Fix the highlighted field"
      : isRendering || !isCurrent
        ? "Rendering…"
        : "Rendered"

  return (
    <section aria-labelledby="preview-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 id="preview-heading" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Preview
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            {OG_WIDTH}×{OG_HEIGHT} PNG · rendered in your browser
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5" role="tablist" aria-label="Preview mode">
            {(["canvas", "unfurl"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={view === mode}
                onClick={() => setView(mode)}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                  view === mode && "bg-secondary text-foreground",
                )}
              >
                {mode === "unfurl" ? "Link unfurl" : "Canvas"}
              </button>
            ))}
          </div>
          {imageUrl && isCurrent ? (
            <a
              href={imageUrl}
              download={downloadName(params.title)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Download aria-hidden="true" />
              Download
            </a>
          ) : (
            <span aria-disabled="true" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>
              <Download aria-hidden="true" />
              Download
            </span>
          )}
        </div>
      </div>

      <div className={cn("relative overflow-hidden rounded-md border bg-card", view === "unfurl" && "mx-auto w-full max-w-md")}>
        <div className="relative">
          {imageUrl ? (
            <img
              src={imageUrl || "/placeholder.svg"}
              alt={`Open Graph image: ${params.title}`}
              width={OG_WIDTH}
              height={OG_HEIGHT}
              className={cn("block aspect-[1200/630] w-full bg-muted transition-opacity duration-200", dimmed && "opacity-60")}
            />
          ) : (
            <span className="block aspect-[1200/630] w-full animate-pulse bg-muted" />
          )}
          {view === "canvas" ? (
            <span className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-foreground/10" />
          ) : null}
          {highlight.rects.map((rect, index) => (
            <span
              key={`${focus}-${index}`}
              aria-hidden="true"
              style={toBox(rect)}
              className="pointer-events-none absolute rounded-sm bg-brand/15 ring-2 ring-brand transition-all duration-150"
            />
          ))}
          <span
            role="status"
            className={cn(
              "absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-sm bg-background/90 px-2 py-1 font-mono text-xs",
              error ? "text-destructive" : "text-muted-foreground",
              status === "Rendered" && "sr-only",
            )}
          >
            {status}
          </span>
        </div>
        {view === "unfurl" ? (
          <div className="flex flex-col gap-1 border-t px-4 py-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link2 className="size-3.5" aria-hidden="true" />
              {params.siteUrl.split("/")[0]}
            </span>
            <span className="text-sm font-semibold leading-snug">{params.title}</span>
            {params.description ? (
              <span className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{params.description}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="min-h-5 text-xs text-muted-foreground" aria-live="polite">
        {focus ? (
          <>
            <span className="font-medium text-foreground">Editing {FOCUS_LABELS[focus]}</span>
            {highlight.note ? ` · ${highlight.note}` : ""}
          </>
        ) : (
          "Focus a field to see where it lands on the card."
        )}
      </p>
    </section>
  )
}
