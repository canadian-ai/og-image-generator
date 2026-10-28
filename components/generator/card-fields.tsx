"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getPreset } from "@/lib/og/presets"
import { LIMITS, THEMES, type OgParams } from "@/lib/og/schema"

interface CardFieldsProps {
  value: OgParams
  errors: Partial<Record<keyof OgParams, string>>
  onChange: (patch: Partial<OgParams>) => void
  onLoadSample: () => void
}

function Counter({ length, max }: { length: number; max: number }) {
  return (
    <span className={cn("text-xs tabular-nums text-muted-foreground", length > max && "text-destructive")}>
      {length}/{max}
    </span>
  )
}

export function CardFields({ value, errors, onChange, onLoadSample }: CardFieldsProps) {
  const preset = getPreset(value.preset)

  return (
    <fieldset className="flex flex-col gap-5">
      <div className="mb-1 flex items-center justify-between">
        <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Content</legend>
        <Button type="button" variant="ghost" size="xs" onClick={onLoadSample}>
          Load {preset.name} sample
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="og-title">Title</Label>
          <Counter length={value.title.length} max={LIMITS.title} />
        </div>
        <Input
          id="og-title"
          value={value.title}
          onChange={(event) => onChange({ title: event.target.value })}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "og-title-error" : undefined}
        />
        {errors.title ? (
          <p id="og-title-error" className="text-xs text-destructive">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="og-description">Description</Label>
          <Counter length={value.description.length} max={LIMITS.description} />
        </div>
        <Textarea
          id="og-description"
          rows={3}
          value={value.description}
          onChange={(event) => onChange({ description: event.target.value })}
          aria-invalid={Boolean(errors.description)}
          aria-describedby="og-description-hint"
        />
        <p id="og-description-hint" className={cn("text-xs text-muted-foreground", errors.description && "text-destructive")}>
          {errors.description ?? (preset.usesDescription ? "Shown under the title." : `${preset.name} hides the description.`)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="og-eyebrow">Eyebrow</Label>
          <Input
            id="og-eyebrow"
            value={value.eyebrow}
            maxLength={LIMITS.eyebrow}
            onChange={(event) => onChange({ eyebrow: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="og-site">Site</Label>
          <Input
            id="og-site"
            value={value.siteUrl}
            maxLength={LIMITS.siteUrl}
            onChange={(event) => onChange({ siteUrl: event.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Theme">
        <span className="text-sm font-medium">Theme</span>
        <div className="grid grid-cols-2 gap-1 rounded-md border p-1">
          {THEMES.map((theme) => (
            <button
              key={theme}
              type="button"
              role="radio"
              aria-checked={value.theme === theme}
              onClick={() => onChange({ theme })}
              className={cn(
                "rounded-sm px-3 py-1.5 text-sm capitalize text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                value.theme === theme && "bg-secondary text-foreground",
              )}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  )
}
