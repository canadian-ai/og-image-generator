import { ArrayBufferTarget, Muxer } from "mp4-muxer"
import { OG_HEIGHT, OG_WIDTH } from "../schema"
import { drawFrame, type VideoScene } from "./scene"
import { VIDEO_FPS, VIDEO_FRAME_COUNT } from "./timeline"

export const MP4_MIME = "video/mp4"

/** H.264 profiles to try, best first. Level 4.0 covers 1200x630 at 60fps. */
const H264_CODECS = ["avc1.640028", "avc1.4d0028", "avc1.42002a"]
const BITRATE = 6_000_000
const KEYFRAME_INTERVAL = VIDEO_FPS

export function hasWebCodecs(): boolean {
  return typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined"
}

async function pickCodec(): Promise<string | null> {
  if (!hasWebCodecs()) return null
  for (const codec of H264_CODECS) {
    const { supported } = await VideoEncoder.isConfigSupported({
      codec,
      width: OG_WIDTH,
      height: OG_HEIGHT,
      bitrate: BITRATE,
      framerate: VIDEO_FPS,
    })
    if (supported) return codec
  }
  return null
}

export async function canEncodeMp4(): Promise<boolean> {
  return (await pickCodec()) !== null
}

export interface EncodeOptions {
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

/** Steps the timeline frame by frame through WebCodecs and muxes it into a faststart MP4, entirely in the browser. */
export async function encodeMp4(scene: VideoScene, { onProgress, signal }: EncodeOptions = {}): Promise<Uint8Array> {
  const codec = await pickCodec()
  if (!codec) throw new Error("This browser cannot encode H.264 video. Try Chrome, Edge or Safari.")

  const canvas = document.createElement("canvas")
  canvas.width = OG_WIDTH
  canvas.height = OG_HEIGHT
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not create a drawing surface for the video.")

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: OG_WIDTH, height: OG_HEIGHT, frameRate: VIDEO_FPS },
    fastStart: "in-memory",
  })

  let failure: Error | null = null
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      failure = error
    },
  })
  encoder.configure({
    codec,
    width: OG_WIDTH,
    height: OG_HEIGHT,
    bitrate: BITRATE,
    framerate: VIDEO_FPS,
    latencyMode: "quality",
    avc: { format: "avc" },
  })

  try {
    for (let frame = 0; frame < VIDEO_FRAME_COUNT; frame++) {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError")
      if (failure) throw failure

      drawFrame(ctx, scene, frame / VIDEO_FPS)
      const videoFrame = new VideoFrame(canvas, {
        timestamp: Math.round((frame * 1_000_000) / VIDEO_FPS),
        duration: Math.round(1_000_000 / VIDEO_FPS),
      })
      encoder.encode(videoFrame, { keyFrame: frame % KEYFRAME_INTERVAL === 0 })
      videoFrame.close()

      while (encoder.encodeQueueSize > 8) await new Promise((resolve) => setTimeout(resolve, 0))
      if (frame % 6 === 0) {
        onProgress?.(frame / VIDEO_FRAME_COUNT)
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }
    await encoder.flush()
    if (failure) throw failure
  } finally {
    if (encoder.state !== "closed") encoder.close()
  }

  muxer.finalize()
  onProgress?.(1)
  return new Uint8Array(target.buffer)
}
