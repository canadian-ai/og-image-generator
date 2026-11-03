"use client"

import { ArrowRight } from "lucide-react"
import { useMemo, useState, type FocusEvent, type SyntheticEvent } from "react"
import { Button } from "@/components/ui/button"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useObjectUrl, useOgRender } from "@/hooks/use-og-render"
import { EMPTY_ASSETS, type OgAssets } from "@/lib/og/assets"
import { getPreset, presetSampleParams } from "@/lib/og/presets"
import { isFocusTarget, type FocusTarget } from "@/lib/og/regions"
import { ogParamsSchema, type OgParams, type PresetId } from "@/lib/og/schema"
import { themeName } from "@/lib/og/themes"
import { CardFields } from "./card-fields"
import { OgPreview } from "./og-preview"
import { PresetPicker } from "./preset-picker"
import { Section } from "./section"
import { StyleFields } from "./style-fields"
import { ThemePicker } from "./theme-picker"
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
      customColors: current.customColors,
      headingFont: current.headingFont,
      bodyFont: current.bodyFont,
      logo: current.logo,
    }))

  const [focus, setFocus] = useState<FocusTarget | null>(null)
  const fieldOf = (element: EventTarget | null) =>
    element instanceof Element ? element.closest<HTMLElement>("[data-og-field]")?.dataset.ogField : undefined
  const trackFocus = (event: SyntheticEvent) => {
    const field = fieldOf(event.target)
    if (isFocusTarget(field)) setFocus(field)
  }
  const releaseFocus = (event: FocusEvent) => {
    if (!fieldOf(event.relatedTarget)) setFocus(null)
  }

  const style = {
    theme: draft.theme,
    customColors: draft.customColors,
    headingFont: draft.headingFont,
    bodyFont: draft.bodyFont,
    logo: draft.logo,
  }

  // 0 means every step is collapsed; `reached` marks steps the user has moved past.
  const [openStep, setOpenStep] = useState(1)
  const [reached, setReached] = useState(1)
  const [pullRequest, setPullRequest] = useState<{ number: number; url: string } | null>(null)
  const goTo = (step: number) => {
    setOpenStep(step)
    setReached((current) => Math.max(current, step))
  }
  const toggle = (step: number) => (open: boolean) => (open ? goTo(step) : setOpenStep(0))
  const next = (step: number, label: string) => (
    <div>
      <Button type="button" variant="outline" size="sm" onClick={() => goTo(step)}>
        Next: {label}
        <ArrowRight aria-hidden="true" />
      </Button>
    </div>
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <ol className="flex flex-col" onFocus={trackFocus} onClick={trackFocus} onBlur={releaseFocus}>
        <Section
          index={1}
          title="Preset"
          summary={`${getPreset(draft.preset).name} · ${themeName(draft.theme)}`}
          open={openStep === 1}
          onOpenChange={toggle(1)}
          done={reached > 1}
        >
          <PresetPicker value={draft.preset} style={style} assets={assets} onChange={selectPreset} />
          <ThemePicker
            theme={draft.theme}
            customColors={draft.customColors}
            error={fieldErrors.customColors}
            onChange={update}
          />
          {next(2, "Content")}
        </Section>
        <Section
          index={2}
          title="Content"
          summary={draft.title}
          open={openStep === 2}
          onOpenChange={toggle(2)}
          done={reached > 2}
        >
          <CardFields value={draft} errors={fieldErrors} onChange={update} onLoadSample={loadSample} />
          {next(3, "Style")}
        </Section>
        <Section
          index={3}
          title="Style"
          summary={`${draft.headingFont} · ${draft.bodyFont}`}
          open={openStep === 3}
          onOpenChange={toggle(3)}
          done={reached > 3}
        >
          <StyleFields value={draft} assets={assets} onChange={update} onAssetsChange={setAssets} />
          {next(4, "Ship it as a pull request")}
        </Section>
        <Section
          index={4}
          title="Ship it as a pull request"
          summary={pullRequest ? `PR #${pullRequest.number}` : undefined}
          open={openStep === 4}
          onOpenChange={toggle(4)}
          done={Boolean(pullRequest)}
        >
          <PublishPanel
            params={lastValid}
            render={preview.isCurrent ? preview.render : undefined}
            isDraftValid={validation.success && !preview.error}
            onOpened={setPullRequest}
          />
        </Section>
      </ol>
      <div className="lg:sticky lg:top-6 lg:self-start">
        <OgPreview
          params={lastValid}
          imageUrl={imageUrl}
          isRendering={preview.isRendering}
          isCurrent={preview.isCurrent}
          error={preview.error?.message}
          isStale={!validation.success}
          focus={focus}
        />
      </div>
    </div>
  )
}
