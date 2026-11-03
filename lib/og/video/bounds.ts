export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Bounding box of every pixel whose alpha is above `threshold`, or null for an empty layer. */
export function alphaBounds(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number, threshold = 8): Rect | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    const row = y * width * 4
    for (let x = 0; x < width; x++) {
      if (rgba[row + x * 4 + 3] <= threshold) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

export function padRect(rect: Rect, pad: number, width: number, height: number): Rect {
  const x = Math.max(0, rect.x - pad)
  const y = Math.max(0, rect.y - pad)
  const right = Math.min(width, rect.x + rect.width + pad)
  const bottom = Math.min(height, rect.y + rect.height + pad)
  return { x, y, width: right - x, height: bottom - y }
}
