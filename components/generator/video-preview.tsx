"use client"

import { Download, Pause, Play } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { OG_HEIGHT, OG_WIDTH } from "@/lib/og/schema"
import { canEncodeMp4, encodeMp4, MP4_MIME } from "@/lib/og/video/encode"
import { drawFrame, type VideoScene } from "@/lib/og/video/scene"
import { VIDEO_DURATION } from "@/lib/og/video/timeline"

interface VideoPreviewProps {
  scene: VideoScene | undefined
  isBuilding: boolean
  error: string | undefined
  title: string
}

function fileName(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
  return `og-${slug || "video"}.mp4`
}

export function VideoPreview({ scene, isBuilding, error, title }: VideoPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timeRef = useRef(0)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [exportProgress, setExportProgress] = useState<number | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [supported, setSupported] = useState<boolean | null>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false)
    canEncodeMp4().then(setSupported, () => setSupported(false))
  }, [])

  const paint = useCallback(
    (t: number) => {
      const ctx = canvasRef.current?.getContext("2d")
      if (ctx && scene) drawFrame(ctx, scene, t)
    },
    [scene],
  )

  useEffect(() => {
    paint(timeRef.current)
    if (!playing || !scene) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      timeRef.current = (timeRef.current + (now - last) / 1000) % VIDEO_DURATION
      last = now
      paint(timeRef.current)
      setTime(timeRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, scene, paint])

  const scrub = (value: number) => {
    timeRef.current = value
    setTime(value)
    setPlaying(false)
    paint(value)
  }

  const exportVideo = async () => {
    if (!scene) return
    setExportError(null)
    setExportProgress(0)
    try {
      const bytes = await encodeMp4(scene, { onProgress: setExportProgress })
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: MP4_MIME }))
      const link = document.createElement("a")
      link.href = url
      link.download = fileName(title)
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : "Could not export the video.")
    } finally {
      setExportProgress(null)
    }
  }

  const exporting = exportProgress !== null
  const status = error ? `Could not build the video: ${error}` : !scene ? "Building layers…" : isBuilding ? "Updating…" : null

  return (
    <div className="flex flex-col">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={OG_WIDTH}
          height={OG_HEIGHT}
          role="img"
          aria-label={`Animated Open Graph video: ${title}`}
          className={cn("block aspect-[1200/630] w-full bg-muted transition-opacity duration-200", isBuilding && "opacity-70")}
        />
        {status ? (
          <span
            role="status"
            className={cn(
              "absolute left-3 top-3 rounded-sm bg-background/90 px-2 py-1 font-mono text-xs",
              error ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {status}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setPlaying((current) => !current)}
          disabled={!scene}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </Button>
        <input
          type="range"
          min={0}
          max={VIDEO_DURATION}
          step={1 / 60}
          value={time}
          disabled={!scene}
          onChange={(event) => scrub(Number(event.target.value))}
          aria-label="Timeline"
          className="h-1 min-w-24 flex-1 accent-brand"
        />
        <span className="w-20 text-right font-mono text-xs tabular-nums text-muted-foreground">
          {time.toFixed(2)}s / {VIDEO_DURATION.toFixed(2)}s
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={exportVideo}
          disabled={!scene || exporting || supported === false}
        >
          <Download aria-hidden="true" />
          {exporting ? `Encoding ${Math.round((exportProgress ?? 0) * 100)}%` : "Download MP4"}
        </Button>
      </div>
      {supported === false ? (
        <p className="px-3 pb-2 text-xs text-muted-foreground">
          This browser cannot encode H.264. Use Chrome, Edge or Safari to export the MP4; the preview still plays.
        </p>
      ) : null}
      {exportError ? (
        <p role="alert" className="px-3 pb-2 text-xs text-destructive">
          {exportError}
        </p>
      ) : null}
    </div>
  )
}
