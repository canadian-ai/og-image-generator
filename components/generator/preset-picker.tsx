"use client"

import { useObjectUrl, useOgRender } from "@/hooks/use-og-render"
import { cn } from "@/lib/utils"
import type { OgAssets } from "@/lib/og/assets"
import { PRESETS } from "@/lib/og/presets"
import type { OgParams, PresetId } from "@/lib/og/schema"

interface PresetPickerProps {
  value: PresetId
  /** Current style (theme, fonts, logo) so thumbnails show what the user will get. */
  style: Pick<OgParams, "theme" | "headingFont" | "bodyFont" | "logo">
  assets: OgAssets
  onChange: (preset: PresetId) => void
}

function PresetThumbnail({ params, assets }: { params: OgParams; assets: OgAssets }) {
  const { render, isCurrent } = useOgRender(params, assets)
  const url = useObjectUrl(render?.png, "image/png")
  return url ? (
    <img
      src={url || "/placeholder.svg"}
      alt=""
      width={1200}
      height={630}
      className={cn("aspect-[1200/630] w-full rounded-sm bg-muted object-cover transition-opacity", !isCurrent && "opacity-60")}
    />
  ) : (
    <span className="block aspect-[1200/630] w-full animate-pulse rounded-sm bg-muted" />
  )
}

export function PresetPicker({ value, style, assets, onChange }: PresetPickerProps) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Preset</legend>
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map((preset) => {
          const selected = preset.id === value
          return (
            <label
              key={preset.id}
              className={cn(
                "group flex cursor-pointer flex-col gap-2 rounded-md border p-2 transition-colors hover:border-muted-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                selected && "border-brand bg-secondary hover:border-brand",
              )}
            >
              <input
                type="radio"
                name="preset"
                value={preset.id}
                checked={selected}
                onChange={() => onChange(preset.id)}
                className="sr-only"
              />
              <PresetThumbnail params={{ ...preset.sample, ...style, preset: preset.id }} assets={assets} />
              <span className="flex flex-col gap-0.5 px-0.5">
                <span className="text-sm font-medium">{preset.name}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">{preset.summary}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
