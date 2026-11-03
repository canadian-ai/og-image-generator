"use client"

import useSWR from "swr"
import { assetsKey, type OgAssets } from "@/lib/og/assets"
import type { OgParams } from "@/lib/og/schema"
import { buildVideoScene, type VideoScene } from "@/lib/og/video/scene"

/** Builds the layered scene for the current card, only while the video view is open. */
export function useOgVideoScene(params: OgParams, assets: OgAssets, enabled: boolean) {
  const key = `${JSON.stringify(params)}#${assetsKey(assets)}`
  const result = useSWR<VideoScene, Error>(enabled ? ["og-video-scene", key] : null, () => buildVideoScene(params, assets), {
    keepPreviousData: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  })
  return { scene: result.data, isBuilding: result.isLoading || result.isValidating, error: result.error }
}
