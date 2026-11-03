import { inflateSync } from "node:zlib"

export interface DecodedPng {
  width: number
  height: number
  /** Straight (non-premultiplied) RGBA, 4 bytes per pixel. */
  data: Uint8Array
}

/** Minimal decoder for the 8-bit, non-interlaced RGB/RGBA PNGs Takumi produces. */
export function decodePng(png: Uint8Array): DecodedPng {
  const buf = Buffer.from(png)
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  const bitDepth = buf[24]
  const colorType = buf[25]
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2 && colorType !== 3) || buf[28] !== 0) {
    throw new Error(`Unsupported PNG (depth ${bitDepth}, color type ${colorType}, interlace ${buf[28]})`)
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1

  const idat: Buffer[] = []
  let palette = Buffer.alloc(0)
  let paletteAlpha = Buffer.alloc(0)
  for (let offset = 8; offset < buf.length; ) {
    const length = buf.readUInt32BE(offset)
    const type = buf.toString("ascii", offset + 4, offset + 8)
    const body = buf.subarray(offset + 8, offset + 8 + length)
    if (type === "IDAT") idat.push(body)
    else if (type === "PLTE") palette = body
    else if (type === "tRNS") paletteAlpha = body
    offset += 12 + length
  }

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const pixels = new Uint8Array(height * stride)

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const rowIn = y * (stride + 1) + 1
    const rowOut = y * stride
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? pixels[rowOut + i - channels] : 0
      const up = y > 0 ? pixels[rowOut - stride + i] : 0
      const upLeft = y > 0 && i >= channels ? pixels[rowOut - stride + i - channels] : 0
      let predictor = 0
      if (filter === 1) predictor = left
      else if (filter === 2) predictor = up
      else if (filter === 3) predictor = (left + up) >> 1
      else if (filter === 4) {
        const estimate = left + up - upLeft
        const dLeft = Math.abs(estimate - left)
        const dUp = Math.abs(estimate - up)
        const dUpLeft = Math.abs(estimate - upLeft)
        predictor = dLeft <= dUp && dLeft <= dUpLeft ? left : dUp <= dUpLeft ? up : upLeft
      }
      pixels[rowOut + i] = (raw[rowIn + i] + predictor) & 0xff
    }
  }

  const data = new Uint8Array(width * height * 4)
  for (let p = 0; p < width * height; p++) {
    if (colorType === 3) {
      const index = pixels[p]
      data[p * 4] = palette[index * 3]
      data[p * 4 + 1] = palette[index * 3 + 1]
      data[p * 4 + 2] = palette[index * 3 + 2]
      data[p * 4 + 3] = index < paletteAlpha.length ? paletteAlpha[index] : 255
      continue
    }
    data[p * 4] = pixels[p * channels]
    data[p * 4 + 1] = pixels[p * channels + 1]
    data[p * 4 + 2] = pixels[p * channels + 2]
    data[p * 4 + 3] = channels === 4 ? pixels[p * channels + 3] : 255
  }
  return { width, height, data }
}

/** Source-over composite of `top` onto `bottom`, both straight RGBA of equal size. */
export function compositeOver(bottom: Uint8Array, top: Uint8Array): Uint8Array {
  const out = new Uint8Array(bottom.length)
  for (let i = 0; i < bottom.length; i += 4) {
    const ta = top[i + 3] / 255
    const ba = bottom[i + 3] / 255
    const oa = ta + ba * (1 - ta)
    for (let c = 0; c < 3; c++) {
      const value = oa === 0 ? 0 : (top[i + c] * ta + bottom[i + c] * ba * (1 - ta)) / oa
      out[i + c] = Math.round(value)
    }
    out[i + 3] = Math.round(oa * 255)
  }
  return out
}

/** Mean absolute difference over the RGB channels. */
export function meanColorDiff(a: Uint8Array, b: Uint8Array): number {
  let total = 0
  for (let i = 0; i < a.length; i += 4) {
    total += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])
  }
  return total / ((a.length / 4) * 3)
}
