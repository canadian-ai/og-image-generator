import { describe, expect, it, vi } from "vitest"
import { bytesToBase64 } from "@/lib/encoding"
import { createGitHubClient, GitHubError } from "@/lib/github/client"
import { buildPrPlan, executePrPlan, headBranchName, metadataSnippet, validateTargetPath } from "@/lib/github/plan"
import { presetSampleParams } from "@/lib/og/presets"

type Route = { method: string; path: string; status?: number; body?: unknown }

function mockFetch(routes: Route[]) {
  const calls: { method: string; url: string; body: unknown; headers: Record<string, string> }[] = []
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? "GET"
    calls.push({
      method,
      url,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      headers: init?.headers as Record<string, string>,
    })
    const route = routes.find((candidate) => candidate.method === method && url.endsWith(candidate.path))
    if (!route) return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 })
    return new Response(JSON.stringify(route.body ?? {}), { status: route.status ?? 200 })
  })
  return { impl: impl as unknown as typeof fetch, calls }
}

const repo = { owner: "canadian-ai", name: "site", defaultBranch: "main" }
const now = new Date("2026-10-24T15:04:05Z")

describe("validateTargetPath", () => {
  it.each([
    ["app/opengraph-image.png", null],
    ["public/og/blog-launch.png", null],
    ["", "Path is required."],
    ["/public/og.png", expect.stringContaining("leading slash")],
    ["public/../secret.png", expect.stringContaining("..")],
    [".github/og.png", expect.stringContaining(".github")],
    ["public/og.jpg", "The file must be a .png."],
    ["public/og image.png", expect.stringContaining("letters")],
  ])("%s", (path, expected) => {
    expect(validateTargetPath(path)).toEqual(expected)
  })
})

describe("buildPrPlan", () => {
  it("plans a create for the Next.js convention path", () => {
    const plan = buildPrPlan({ repo, filePath: "app/opengraph-image.png", existingSha: null, params: presetSampleParams("spotlight"), now })
    expect(plan.action).toBe("create")
    expect(plan.headBranch).toBe("og-image/favicon-generator-202610241504")
    expect(plan.baseBranch).toBe("main")
    expect(plan.prTitle).toBe("Add Open Graph image: Favicon Generator")
    expect(plan.prBody).toContain("picks this file up automatically")
    expect(plan.prBody).toContain("1200x630")
  })

  it("plans an update with sha and metadata snippet for public assets", () => {
    const params = { ...presetSampleParams("split"), title: "A | B" }
    const plan = buildPrPlan({ repo, filePath: "public/og-image.png", existingSha: "abc123", params, now })
    expect(plan.action).toBe("update")
    expect(plan.existingSha).toBe("abc123")
    expect(plan.commitMessage).toBe("Update Open Graph image (Split)")
    expect(plan.prBody).toContain('url: "/og-image.png"')
    expect(plan.prBody).toContain("A \\| B")
  })

  it("only emits a metadata snippet for statically served paths", () => {
    expect(metadataSnippet("app/opengraph-image.png", presetSampleParams("spotlight"))).toBeNull()
  })

  it("builds safe branch names from arbitrary titles", () => {
    expect(headBranchName("Ünïcode & emoji!! launch", now)).toBe("og-image/unicode-emoji-launch-202610241504")
    expect(headBranchName("!!!", now)).toBe("og-image/card-202610241504")
  })
})

describe("GitHub client", () => {
  it("sends the token only to api.github.com with the API version header", async () => {
    const { impl, calls } = mockFetch([{ method: "GET", path: "/user", body: { login: "octo", name: null, avatar_url: "a" } }])
    const user = await createGitHubClient("ghp_test", impl).getUser()
    expect(user.login).toBe("octo")
    expect(calls[0].url).toBe("https://api.github.com/user")
    expect(calls[0].headers.Authorization).toBe("Bearer ghp_test")
    expect(calls[0].headers["X-GitHub-Api-Version"]).toBe("2022-11-28")
  })

  it("maps 401 to a friendly GitHubError", async () => {
    const { impl } = mockFetch([{ method: "GET", path: "/user", status: 401, body: { message: "Bad credentials" } }])
    const error = await createGitHubClient("bad", impl).getUser().catch((caught) => caught)
    expect(error).toBeInstanceOf(GitHubError)
    expect(error.status).toBe(401)
    expect(error.message).toMatch(/invalid or expired/)
  })

  it("returns null sha for missing files and the sha for existing ones", async () => {
    const { impl } = mockFetch([
      { method: "GET", path: "/contents/public/og-image.png?ref=main", body: { sha: "s1", type: "file" } },
    ])
    const client = createGitHubClient("t", impl)
    expect(await client.getFileSha("o", "r", "public/og-image.png", "main")).toBe("s1")
    expect(await client.getFileSha("o", "r", "app/opengraph-image.png", "main")).toBeNull()
  })
})

describe("executePrPlan", () => {
  it("creates branch, commits the PNG with sha, then opens the PR in order", async () => {
    const { impl, calls } = mockFetch([
      { method: "GET", path: "/repos/canadian-ai/site/git/ref/heads/main", body: { object: { sha: "base" } } },
      { method: "POST", path: "/repos/canadian-ai/site/git/refs", status: 201 },
      { method: "PUT", path: "/repos/canadian-ai/site/contents/public/og-image.png", status: 201 },
      { method: "POST", path: "/repos/canadian-ai/site/pulls", status: 201, body: { number: 7, html_url: "https://github.com/canadian-ai/site/pull/7" } },
    ])
    const plan = buildPrPlan({ repo, filePath: "public/og-image.png", existingSha: "old", params: presetSampleParams("statement"), now })
    const steps: string[] = []
    const content = bytesToBase64(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))

    const result = await executePrPlan(createGitHubClient("t", impl), plan, content, (step) => steps.push(step))

    expect(result).toEqual({ number: 7, url: "https://github.com/canadian-ai/site/pull/7" })
    expect(steps).toEqual(["branch", "commit", "pull-request"])
    expect(calls.map((call) => call.method)).toEqual(["GET", "POST", "PUT", "POST"])
    expect(calls[1].body).toEqual({ ref: `refs/heads/${plan.headBranch}`, sha: "base" })
    expect(calls[2].body).toMatchObject({ branch: plan.headBranch, sha: "old", content: "iVBORw==" })
    expect(calls[3].body).toMatchObject({ head: plan.headBranch, base: "main" })
  })

  it("stops before opening a PR when the commit fails", async () => {
    const { impl, calls } = mockFetch([
      { method: "GET", path: "/git/ref/heads/main", body: { object: { sha: "base" } } },
      { method: "POST", path: "/git/refs", status: 201 },
      { method: "PUT", path: "/contents/app/opengraph-image.png", status: 409, body: { message: "sha mismatch" } },
    ])
    const plan = buildPrPlan({ repo, filePath: "app/opengraph-image.png", existingSha: null, params: presetSampleParams("spotlight"), now })
    await expect(executePrPlan(createGitHubClient("t", impl), plan, "AA==")).rejects.toThrow("sha mismatch")
    expect(calls.some((call) => call.url.endsWith("/pulls"))).toBe(false)
  })
})

describe("bytesToBase64", () => {
  it("encodes large buffers without overflowing", () => {
    const bytes = new Uint8Array(200_000).fill(65)
    expect(Buffer.from(bytesToBase64(bytes), "base64").equals(Buffer.from(bytes))).toBe(true)
  })
})
