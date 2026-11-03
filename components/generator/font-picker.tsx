"use client"

import { Check, ChevronsUpDown } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { Label } from "@/components/ui/label"
import type { UploadedFont } from "@/lib/og/assets"
import { GOOGLE_FONTS, type GoogleFontChoice } from "@/lib/og/schema"
import { cn } from "@/lib/utils"

const GENERIC: Record<GoogleFontChoice["category"], string> = {
  serif: "serif",
  sans: "sans-serif",
  mono: "monospace",
}

const googleFontsHref = `https://fonts.googleapis.com/css2?${GOOGLE_FONTS.map(
  (font) => `family=${font.family.replace(/ /g, "+")}:wght@400;700`,
).join("&")}&display=swap`

/** CSS font-family value for a family in the picker, falling back to a generic of the right kind. */
export function previewFamily(family: string): string {
  const google = GOOGLE_FONTS.find((font) => font.family === family)
  return `"${family}", ${google ? GENERIC[google.category] : "sans-serif"}`
}

/** Loads the curated Google families for the picker UI and registers uploaded files as FontFaces. */
export function useFontPreviews(uploaded: UploadedFont[]) {
  useEffect(() => {
    const faces: FontFace[] = []
    for (const font of uploaded) {
      const face = new FontFace(font.name, font.data.slice().buffer as ArrayBuffer)
      faces.push(face)
      face.load().then(
        () => document.fonts.add(face),
        () => {},
      )
    }
    return () => {
      for (const face of faces) document.fonts.delete(face)
    }
  }, [uploaded])
}

interface FontPickerProps {
  field: "headingFont" | "bodyFont"
  label: string
  value: string
  uploaded: string[]
  sample: string
  onChange: (family: string) => void
}

function Option({
  family,
  selected,
  sample,
  onPick,
}: {
  family: string
  selected: boolean
  sample: string
  onPick: (family: string) => void
}) {
  return (
    <li role="presentation">
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={() => onPick(family)}
        className={cn(
          "flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50",
          selected && "bg-secondary",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-lg leading-tight" style={{ fontFamily: previewFamily(family) }}>
            {family}
          </span>
          <span className="truncate text-xs text-muted-foreground" style={{ fontFamily: previewFamily(family) }}>
            {sample}
          </span>
        </span>
        {selected ? <Check className="size-4 shrink-0 text-brand" aria-hidden="true" /> : null}
      </button>
    </li>
  )
}

export function FontPicker({ field, label, value, uploaded, sample, onChange }: FontPickerProps) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  const pick = (family: string) => {
    onChange(family)
    setOpen(false)
  }

  return (
    <div
      ref={root}
      className="flex min-w-0 flex-col gap-2"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation()
          setOpen(false)
        }
      }}
    >
      <link rel="stylesheet" href={googleFontsHref} precedence="default" />
      <Label id={`${id}-label`} htmlFor={`${id}-trigger`}>
        {label}
      </Label>
      <button
        id={`${id}-trigger`}
        type="button"
        data-og-field={field}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          className={cn("truncate leading-none", field === "headingFont" ? "text-xl font-bold" : "text-base")}
          style={{ fontFamily: previewFamily(value) }}
        >
          {value}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      {open ? (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="flex max-h-72 flex-col gap-0.5 overflow-auto rounded-md border bg-card p-1"
        >
          {uploaded.length > 0 ? (
            <li role="presentation" className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">
              Your fonts
            </li>
          ) : null}
          {uploaded.map((name) => (
            <Option key={`u-${name}`} family={name} selected={name === value} sample={sample} onPick={pick} />
          ))}
          <li role="presentation" className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">
            Google Fonts
          </li>
          {GOOGLE_FONTS.map((font) => (
            <Option key={font.family} family={font.family} selected={font.family === value} sample={sample} onPick={pick} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}
