"use client"

import { useMemo, useState } from "react"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useObjectUrl, useOgRender } from "@/hooks/use-og-render"
import { EMPTY_ASSETS, type OgAssets } from "@/lib/og/assets"
import { presetSampleParams } from "@/lib/og/presets"
import { ogParamsSchema, type OgParams, type PresetId } from "@/lib/og/schema"
import { CardFields } from "./card-fields"
import { OgPreview } from "./og-preview"
import { PresetPicker } from "./preset-picker"
import { StyleFields } from "./style-fields"
import { PublishPanel } from "@/components/publish/publish-panel"

export function Generator() {
  const [draft, setDraft] = useState<OgParams>(() => presetSampleParams("spotlight"))
  const [assets, setAssets] = useState<OgAssets>(EMPTY_ASSETS)
  const debouncedDraft = useDebouncedValue(draft, 250)

  const validation = useMemo(() => ogParamsSchema.safeParse(draft), [draft])
  const fieldErrors = useMemo(() => {
    if (validation.success) return {}
    const errors: Partial<Record<keyof OgParams, string>> = {}
    for (const issue of validation.error.issues) {
      const key = issue.path[0] as keyof OgParams
      errors[key] ??= issue.message
    }
    return errors
  }, [validation])

  const [lastValid, setLastValid] = useState<OgParams>(draft)
  const debouncedValid = useMemo(() => ogParamsSchema.safeParse(debouncedDraft), [debouncedDraft])
  if (debouncedValid.success && JSON.stringify(debouncedValid.data) !== JSON.stringify(lastValid)) {
    setLastValid(debouncedValid.data)
  }

  const preview = useOgRender(lastValid, assets)
  const imageUrl = useObjectUrl(preview.render?.png, "image/png")

  const update = (patch: Partial<OgParams>) => setDraft((current) => ({ ...current, ...patch }))
  const selectPreset = (preset: PresetId) => update({ preset })
  const loadSample = () =>
    setDraft((current) => ({
      ...presetSampleParams(current.preset),
      theme: current.theme,
      headingFont: current.headingFont,
      bodyFont: current.bodyFont,
      logo: current.logo,
    }))

  const style = { theme: draft.theme, headingFont: draft.headingFont, bodyFont: draft.bodyFont, logo: draft.logo }

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-8">
          <PresetPicker value={draft.preset} style={style} assets={assets} onChange={selectPreset} />
          <CardFields value={draft} errors={fieldErrors} onChange={update} onLoadSample={loadSample} />
          <StyleFields value={draft} assets={assets} onChange={update} onAssetsChange={setAssets} />
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <OgPreview
            params={lastValid}
            imageUrl={imageUrl}
            isRendering={preview.isRendering}
            isCurrent={preview.isCurrent}
            error={preview.error?.message}
            isStale={!validation.success}
          />
        </div>
      </div>
      <PublishPanel
        params={lastValid}
        render={preview.isCurrent ? preview.render : undefined}
        isDraftValid={validation.success && !preview.error}
      />
    </div>
  )
}
