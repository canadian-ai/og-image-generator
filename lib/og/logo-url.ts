import { MAX_LOGO_BYTES, sniffLogoType, type UploadedLogo } from "./assets"

export class LogoUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LogoUrlError"
  }
}

const BLOCKED_MESSAGE =
  "Couldn't load that URL. The host may block cross-origin requests, so download the file and upload it instead."

/** Validates the URL and rewrites GitHub "blob" pages to their raw file. */
export function normalizeLogoUrl(raw: string): URL {
  const trimmed = raw.trim()
  if (!trimmed) throw new LogoUrlError("Paste an image or SVG URL.")

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new LogoUrlError("That doesn't look like a URL.")
  }
  if (url.protocol !== "https:") throw new LogoUrlError("Use an https:// URL.")
  if (url.username || url.password) throw new LogoUrlError("Remove the credentials from the URL.")

  if (url.hostname === "github.com") {
    const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/)
    if (match) return new URL(`https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}`)
  }
  return url
}

function fileNameFor(url: URL): string {
  const last = url.pathname.split("/").filter(Boolean).pop() ?? ""
  try {
    return decodeURIComponent(last) || url.hostname
  } catch {
    return last || url.hostname
  }
}

/** Reads a response body but gives up as soon as it passes the size cap. */
async function readCapped(response: Response, limit: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length"))
  if (Number.isFinite(declared) && declared > limit) throw new LogoUrlError("Logos must be 1 MB or smaller.")

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > limit) throw new LogoUrlError("Logos must be 1 MB or smaller.")
    return bytes
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel()
      throw new LogoUrlError("Logos must be 1 MB or smaller.")
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

export interface FetchLogoOptions {
  fetchImpl?: typeof fetch
  signal?: AbortSignal
}

/** Downloads an SVG, PNG, JPEG or WebP in the browser and returns it as an uploaded logo. */
export async function fetchLogoFromUrl(raw: string, options: FetchLogoOptions = {}): Promise<UploadedLogo> {
  const url = normalizeLogoUrl(raw)
  const fetchImpl = options.fetchImpl ?? fetch

  let response: Response
  try {
    response = await fetchImpl(url.href, {
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new LogoUrlError(BLOCKED_MESSAGE)
  }
  if (!response.ok) throw new LogoUrlError(`The server answered ${response.status}. Check the URL and try again.`)

  let data: Uint8Array
  try {
    data = await readCapped(response, MAX_LOGO_BYTES)
  } catch (error) {
    if (error instanceof LogoUrlError) throw error
    throw new LogoUrlError(BLOCKED_MESSAGE)
  }

  const type = sniffLogoType(data)
  if (!type) throw new LogoUrlError("That URL isn't an SVG, PNG, JPEG or WebP image.")
  return { fileName: fileNameFor(url), type, data, sourceUrl: url.href }
}
