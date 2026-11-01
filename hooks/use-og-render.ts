"use client"

import { useEffect, useMemo } from "react"
import useSWR from "swr"
import { assetsKey, type OgAssets } from "@/lib/og/assets"
import { renderInBrowser } from "@/lib/og/client-renderer"
import type { OgParams } from "@/lib/og/schema"

export interface OgRender {
  png: Uint8Array
  /** Identifies the exact params + assets that produced `png`. */
  key: string
}

/** Renders a card in the browser and keeps the previous image on screen while the next one renders. */
export function useOgRender(params: OgParams, assets: OgAssets) {
  const key = `${JSON.stringify(params)}#${assetsKey(assets)}`
  const result = useSWR<OgRender, Error>(
    ["og-render", key],
    async () => ({ png: await renderInBrowser(params, assets), key }),
    { keepPreviousData: true, revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false },
  )
  const current = result.data?.key === key ? result.data : undefined
  return {
    render: result.data,
    isCurrent: Boolean(current),
    isRendering: result.isLoading || result.isValidating,
    error: result.error,
    key,
  }
}

export function useObjectUrl(bytes: Uint8Array | undefined, type: string): string | undefined {
  const url = useMemo(() => (bytes ? URL.createObjectURL(new Blob([bytes as BlobPart], { type })) : undefined), [bytes, type])
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])
  return url
}
