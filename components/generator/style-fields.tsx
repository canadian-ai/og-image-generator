"use client"

import { Link2, Loader2, Upload, X } from "lucide-react"
import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  familyNameFromFile,
  FONT_EXTENSIONS,
  LOGO_TYPES,
  looksLikeFont,
  sniffLogoType,
  validateFontFile,
  validateLogoFile,
  type OgAssets,
  type UploadedLogo,
} from "@/lib/og/assets"
import { fetchLogoFromUrl } from "@/lib/og/logo-url"
import { GOOGLE_FONTS, LOGO_MODES, type LogoMode, type OgParams } from "@/lib/og/schema"

interface StyleFieldsProps {
  value: OgParams
  assets: OgAssets
  onChange: (patch: Partial<OgParams>) => void
  onAssetsChange: (update: (current: OgAssets) => OgAssets) => void
}

const LOGO_LABELS: Record<LogoMode, string> = { brand: "Canadian AI", custom: "Upload", none: "None" }

const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function FontSelect({
  id,
  field,
  label,
  value,
  uploaded,
  onChange,
}: {
  id: string
  field: "headingFont" | "bodyFont"
  label: string
  value: string
  uploaded: string[]
  onChange: (family: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        data-og-field={field}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        {uploaded.length > 0 ? (
          <optgroup label="Uploaded">
            {uploaded.map((name) => (
              <option key={name} value={name} className="bg-popover text-popover-foreground">
                {name}
              </option>
            ))}
          </optgroup>
        ) : null}
        <optgroup label="Google Fonts">
          {GOOGLE_FONTS.map((font) => (
            <option key={font.family} value={font.family} className="bg-popover text-popover-foreground">
              {font.family}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  )
}

async function readFileBytes(file: File): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await file.arrayBuffer())
  } catch {
    return null
  }
}

export function StyleFields({ value, assets, onChange, onAssetsChange }: StyleFieldsProps) {
  const baseId = useId()
  const fontInput = useRef<HTMLInputElement>(null)
  const logoInput = useRef<HTMLInputElement>(null)
  const [fontError, setFontError] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState("")
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const uploadedNames = assets.fonts.map((font) => font.name)

  const addFonts = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    setFontError(null)
    const added: OgAssets["fonts"] = []
    for (const file of files) {
      const problem = validateFontFile(file)
      if (problem) {
        setFontError(`${file.name}: ${problem}`)
        continue
      }
      const data = await readFileBytes(file)
      if (!data) {
        setFontError(`${file.name} could not be read.`)
        continue
      }
      if (!looksLikeFont(data)) {
        setFontError(`${file.name} is not a valid font file.`)
        continue
      }
      added.push({ name: familyNameFromFile(file.name), fileName: file.name, data })
    }
    if (added.length === 0) return
    onAssetsChange((current) => ({
      ...current,
      fonts: [...current.fonts.filter((font) => !added.some((next) => next.name === font.name)), ...added],
    }))
    onChange({ headingFont: added[0].name })
  }

  const removeFont = (name: string) => {
    onAssetsChange((current) => ({ ...current, fonts: current.fonts.filter((font) => font.name !== name) }))
    const fallback: Partial<OgParams> = {}
    if (value.headingFont === name) fallback.headingFont = "Playfair Display"
    if (value.bodyFont === name) fallback.bodyFont = "Inter"
    if (Object.keys(fallback).length > 0) onChange(fallback)
  }

  const setLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const problem = validateLogoFile(file)
    if (problem) {
      setLogoError(problem)
      return
    }
    const data = await readFileBytes(file)
    if (!data) {
      setLogoError(`${file.name} could not be read.`)
      return
    }
    const type = sniffLogoType(data)
    if (!type) {
      setLogoError(`${file.name} is not a valid SVG, PNG, JPEG or WebP image.`)
      return
    }
    setLogoError(null)
    setLogoUrl("")
    const logo: UploadedLogo = { fileName: file.name, type, data }
    onAssetsChange((current) => ({ ...current, logo }))
    onChange({ logo: "custom" })
  }

  const loadLogoUrl = async (event: FormEvent) => {
    event.preventDefault()
    if (isLoadingUrl) return
    setIsLoadingUrl(true)
    setLogoError(null)
    try {
      const logo = await fetchLogoFromUrl(logoUrl)
      onAssetsChange((current) => ({ ...current, logo }))
      onChange({ logo: "custom" })
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "That URL could not be loaded.")
    } finally {
      setIsLoadingUrl(false)
    }
  }

  const chooseLogoMode = (mode: LogoMode) => {
    if (mode === "custom" && !assets.logo) {
      logoInput.current?.click()
      return
    }
    onChange({ logo: mode })
  }

  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="sr-only">Style</legend>

      <div className="grid grid-cols-2 gap-3">
        <FontSelect
          id={`${baseId}-heading`}
          field="headingFont"
          label="Heading font"
          value={value.headingFont}
          uploaded={uploadedNames}
          onChange={(headingFont) => onChange({ headingFont })}
        />
        <FontSelect
          id={`${baseId}-body`}
          field="bodyFont"
          label="Body font"
          value={value.bodyFont}
          uploaded={uploadedNames}
          onChange={(bodyFont) => onChange({ bodyFont })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Your fonts</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => fontInput.current?.click()}>
            <Upload aria-hidden="true" />
            Upload font
          </Button>
          <input
            ref={fontInput}
            type="file"
            accept={FONT_EXTENSIONS.join(",")}
            multiple
            onChange={addFonts}
            className="sr-only"
            aria-label="Upload font files"
            tabIndex={-1}
          />
        </div>
        {assets.fonts.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {assets.fonts.map((font) => (
              <li key={font.name} className="flex items-center gap-1 rounded-md border py-0.5 pl-2.5 pr-0.5 text-xs">
                <span title={font.fileName}>{font.name}</span>
                <button
                  type="button"
                  onClick={() => removeFont(font.name)}
                  className="rounded-sm p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={`Remove ${font.name}`}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            TTF, OTF, WOFF or WOFF2. Files are read in this tab and never uploaded.
          </p>
        )}
        {fontError ? <p role="alert" className="text-xs text-destructive">{fontError}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <span id={`${baseId}-logo`} className="text-sm font-medium">
          Logo
        </span>
        <div role="radiogroup" aria-labelledby={`${baseId}-logo`} className="grid grid-cols-3 gap-1 rounded-md border p-1">
          {LOGO_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              data-og-field="logo"
              aria-checked={value.logo === mode}
              onClick={() => chooseLogoMode(mode)}
              className={cn(
                "rounded-sm px-3 py-1.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                value.logo === mode && "bg-secondary text-foreground",
              )}
            >
              {LOGO_LABELS[mode]}
            </button>
          ))}
        </div>
        <input
          ref={logoInput}
          type="file"
          accept={LOGO_TYPES.join(",")}
          onChange={setLogo}
          className="sr-only"
          aria-label="Upload logo image"
          tabIndex={-1}
        />
        <form onSubmit={loadLogoUrl} className="flex items-center gap-2">
          <Input
            type="url"
            inputMode="url"
            value={logoUrl}
            onChange={(event) => {
              setLogoUrl(event.target.value)
              if (logoError) setLogoError(null)
            }}
            data-og-field="logo"
            placeholder="https://example.com/logo.svg"
            aria-label="Logo image or SVG URL"
            aria-invalid={Boolean(logoError)}
            autoComplete="off"
            spellCheck={false}
          />
          <Button type="submit" variant="outline" size="sm" disabled={isLoadingUrl || logoUrl.trim() === ""}>
            {isLoadingUrl ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Link2 aria-hidden="true" />}
            Use URL
          </Button>
        </form>
        {assets.logo ? (
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="truncate" title={assets.logo.sourceUrl ?? assets.logo.fileName}>
              {assets.logo.sourceUrl ? `From URL: ${assets.logo.fileName}` : assets.logo.fileName}
            </span>
            <button
              type="button"
              onClick={() => logoInput.current?.click()}
              className="shrink-0 underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Replace
            </button>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Upload or link an SVG, PNG, JPEG or WebP up to 1 MB. Square works best. URLs are fetched by your browser, so the host must allow
            cross-origin requests.
          </p>
        )}
        {logoError ? <p role="alert" className="text-xs text-destructive">{logoError}</p> : null}
      </div>
    </fieldset>
  )
}
