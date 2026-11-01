import { describe, expect, it } from "vitest"
import { MAX_LOGO_BYTES } from "@/lib/og/assets"
import { fetchLogoFromUrl, LogoUrlError, normalizeLogoUrl } from "@/lib/og/logo-url"

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>')

function respond(body: BodyInit | null, init: ResponseInit = {}): typeof fetch {
  return async () => new Response(body, init)
}

describe("normalizeLogoUrl", () => {
  it("accepts https URLs", () => {
    expect(normalizeLogoUrl(" https://example.com/logo.svg ").href).toBe("https://example.com/logo.svg")
  })

  it("rejects empty, malformed, insecure and credentialed URLs", () => {
    expect(() => normalizeLogoUrl("   ")).toThrow(LogoUrlError)
    expect(() => normalizeLogoUrl("not a url")).toThrow(/URL/)
    expect(() => normalizeLogoUrl("http://example.com/a.png")).toThrow(/https/)
    expect(() => normalizeLogoUrl("javascript:alert(1)")).toThrow(LogoUrlError)
    expect(() => normalizeLogoUrl("https://user:pw@example.com/a.png")).toThrow(/credentials/)
  })

  it("rewrites GitHub blob pages to the raw file", () => {
    expect(normalizeLogoUrl("https://github.com/canadian-ai/site/blob/main/public/logo.svg").href).toBe(
      "https://raw.githubusercontent.com/canadian-ai/site/main/public/logo.svg",
    )
  })
})

describe("fetchLogoFromUrl", () => {
  it("returns an SVG logo sniffed from bytes, ignoring the content-type header", async () => {
    const logo = await fetchLogoFromUrl("https://example.com/assets/mark.svg", {
      fetchImpl: respond(SVG, { headers: { "content-type": "text/plain" } }),
    })
    expect(logo.type).toBe("image/svg+xml")
    expect(logo.fileName).toBe("mark.svg")
    expect(logo.sourceUrl).toBe("https://example.com/assets/mark.svg")
  })

  it("returns raster images", async () => {
    const logo = await fetchLogoFromUrl("https://example.com/a.png", { fetchImpl: respond(PNG) })
    expect(logo.type).toBe("image/png")
  })

  it("requests without credentials or referrer", async () => {
    let init: RequestInit | undefined
    await fetchLogoFromUrl("https://example.com/a.png", {
      fetchImpl: async (_url, requestInit) => {
        init = requestInit
        return new Response(PNG)
      },
    })
    expect(init).toMatchObject({ mode: "cors", credentials: "omit", referrerPolicy: "no-referrer" })
  })

  it("explains CORS and network failures", async () => {
    await expect(
      fetchLogoFromUrl("https://example.com/a.png", {
        fetchImpl: async () => {
          throw new TypeError("Failed to fetch")
        },
      }),
    ).rejects.toThrow(/upload it instead/)
  })

  it("reports HTTP errors", async () => {
    await expect(
      fetchLogoFromUrl("https://example.com/a.png", { fetchImpl: respond("nope", { status: 404 }) }),
    ).rejects.toThrow(/404/)
  })

  it("rejects non-image responses", async () => {
    await expect(
      fetchLogoFromUrl("https://example.com/page", { fetchImpl: respond("<html>hi</html>") }),
    ).rejects.toThrow(/isn't an SVG, PNG, JPEG or WebP/)
  })

  it("rejects oversized files from the declared length and from the streamed body", async () => {
    await expect(
      fetchLogoFromUrl("https://example.com/big.png", {
        fetchImpl: respond(PNG, { headers: { "content-length": String(MAX_LOGO_BYTES + 1) } }),
      }),
    ).rejects.toThrow(/1 MB/)

    const big = new Uint8Array(MAX_LOGO_BYTES + 10)
    big.set(PNG)
    await expect(fetchLogoFromUrl("https://example.com/big.png", { fetchImpl: respond(big) })).rejects.toThrow(/1 MB/)
  })
})
