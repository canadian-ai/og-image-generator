"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  BUILT_IN_THEMES,
  contrastRatio,
  CUSTOM_THEME_NAME,
  normalizeHex,
  paletteFor,
  swatchesFor,
  themeColors,
  type ThemeColors,
  type ThemeId,
} from "@/lib/og/themes"

interface ThemePickerProps {
  theme: ThemeId
  customColors: ThemeColors
  error?: string
  onChange: (patch: { theme?: ThemeId; customColors?: ThemeColors }) => void
}

const COLOR_FIELDS = [
  { key: "background", label: "Background" },
  { key: "foreground", label: "Text" },
  { key: "accent", label: "Accent" },
] as const

interface ThemeOption {
  id: ThemeId
  name: string
}

const OPTIONS: readonly ThemeOption[] = [
  ...BUILT_IN_THEMES.map(({ id, name }) => ({ id, name })),
  { id: "custom", name: CUSTOM_THEME_NAME },
]

function ThemeCard({
  option,
  selected,
  customColors,
  onSelect,
}: {
  option: ThemeOption
  selected: boolean
  customColors: ThemeColors
  onSelect: () => void
}) {
  const palette = paletteFor(option.id, customColors)
  const swatches = swatchesFor(option.id, customColors)
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col overflow-hidden rounded-md border-2 border-border transition-colors hover:border-muted-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        selected && "border-brand hover:border-brand",
      )}
    >
      <input
        type="radio"
        name="theme"
        value={option.id}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        className="flex items-start justify-between gap-3 px-3 py-2.5"
        style={{ backgroundColor: palette.background, color: palette.foreground }}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{option.name}</span>
          <span className="truncate text-xs" style={{ color: palette.muted }}>
            This is a paragraph.
          </span>
        </span>
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border"
          style={{ borderColor: palette.muted }}
        >
          {selected ? <span className="size-2 rounded-full" style={{ backgroundColor: palette.foreground }} /> : null}
        </span>
      </span>
      <span aria-hidden="true" className="flex h-2.5">
        {swatches.map((color, index) => (
          <span key={`${color}-${index}`} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </span>
    </label>
  )
}

function ColorField({
  id,
  label,
  value,
  onCommit,
}: {
  id: string
  label: string
  value: string
  onCommit: (hex: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color`}
          value={value}
          onChange={(event) => onCommit(event.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
        />
        <Input
          id={id}
          value={draft ?? value}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          className="min-w-0 flex-1 font-mono"
          onFocus={() => setDraft(value)}
          onChange={(event) => {
            setDraft(event.target.value)
            const hex = normalizeHex(event.target.value)
            if (hex) onCommit(hex)
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
    </div>
  )
}

export function ThemePicker({ theme, customColors, error, onChange }: ThemePickerProps) {
  const select = (id: ThemeId) => {
    if (id === theme) return
    // Start a custom theme from whatever is on screen so editing never begins from a blank slate.
    if (id === "custom") onChange({ theme: id, customColors: themeColors(theme, customColors) })
    else onChange({ theme: id })
  }

  const contrast = contrastRatio(customColors.background, customColors.foreground)

  return (
    <fieldset className="flex flex-col gap-3" data-og-field="theme">
      <legend className="mb-3 text-sm font-medium">Theme</legend>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => (
          <ThemeCard
            key={option.id}
            option={option}
            selected={option.id === theme}
            customColors={customColors}
            onSelect={() => select(option.id)}
          />
        ))}
      </div>

      {theme === "custom" ? (
        <div className="flex flex-col gap-3 rounded-md border p-3">
          <div className="grid grid-cols-1 gap-3">
            {COLOR_FIELDS.map(({ key, label }) => (
              <ColorField
                key={key}
                id={`og-color-${key}`}
                label={label}
                value={customColors[key]}
                onCommit={(hex) => onChange({ customColors: { ...customColors, [key]: hex } })}
              />
            ))}
          </div>
          <p className={cn("text-xs text-muted-foreground", (error || contrast < 4.5) && "text-destructive")} role="status">
            {error ??
              (contrast < 4.5
                ? `Text on background is ${contrast.toFixed(1)}:1. Aim for at least 4.5:1 so the card stays readable.`
                : `Text on background is ${contrast.toFixed(1)}:1. Muted text, rules and panels are derived from these three colors.`)}
          </p>
        </div>
      ) : null}
    </fieldset>
  )
}
