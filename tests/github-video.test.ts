import { describe, expect, it, vi } from "vitest"
import { buildPrPlan, executePrPlan, metadataSnippet, videoPathFor } from "@/lib/github/plan"
import type { GitHubClient } from "@/lib/github/client"
import { ogParamsSchema } from "@/lib/og/schema"

const params = ogParamsSchema.parse({ title: "Launch day" })
const repo = { owner: "canadian-ai", name: "site", defaultBranch: "main" }

function fakeClient() {
  const calls: Array<{ name: string; arg: unknown }> = []
  const client = {
    getBranchSha: vi.fn(async () => "base-sha"),
    createBranch: vi.fn(async (...args: unknown[]) => void calls.push({ name: "createBranch", arg: args })),
    putFile: vi.fn(async (arg: unknown) => void calls.push({ name: "putFile", arg })),
    createPullRequest: vi.fn(async () => ({ number: 7, url: "https://github.com/canadian-ai/site/pull/7" })),
  } as unknown as GitHubClient
  return { client, calls }
}

describe("videoPathFor", () => {
  it("sits beside a public image", () => {
    expect(videoPathFor("public/og-image.png")).toBe("public/og-video.mp4")
    expect(videoPathFor("public/img/social/og-image.png")).toBe("public/img/social/og-video.mp4")
  })

  it("falls back to public/ for the App Router convention", () => {
    expect(videoPathFor("app/opengraph-image.png")).toBe("public/og-video.mp4")
  })
})

describe("metadataSnippet with video", () => {
  it("is unchanged when there is no video", () => {
    const snippet = metadataSnippet("public/og-image.png", params)
    expect(snippet).toContain('images: [{ url: "/og-image.png"')
    expect(snippet).toContain("twitter:")
    expect(snippet).not.toContain("videos")
  })

  it("adds an og:video entry next to the image", () => {
    const snippet = metadataSnippet("public/og-image.png", params, "public/og-video.mp4")
    expect(snippet).toContain('videos: [{ url: "/og-video.mp4", width: 1200, height: 630, type: "video/mp4" }]')
    expect(snippet).toContain('images: [{ url: "/og-image.png"')
  })

  it("emits only the video for the App Router convention, where the image is automatic", () => {
    const snippet = metadataSnippet("app/opengraph-image.png", params, "public/og-video.mp4")
    expect(snippet).toContain("videos:")
    expect(snippet).not.toContain("images:")
    expect(snippet).not.toContain("twitter")
  })
})

describe("buildPrPlan with video", () => {
  const base = { repo, filePath: "public/og-image.png", existingSha: null, params, now: new Date("2026-03-11T10:00:00Z") }

  it("has no video and the original wording by default", () => {
    const plan = buildPrPlan(base)
    expect(plan.video).toBeNull()
    expect(plan.commitMessage).toMatch(/^Add Open Graph image \(/)
    expect(plan.prBody).not.toContain("og-video.mp4")
  })

  it("plans a new video file and describes it in the PR", () => {
    const plan = buildPrPlan({ ...base, video: { existingSha: null } })
    expect(plan.video).toEqual({ filePath: "public/og-video.mp4", action: "create", existingSha: null })
    expect(plan.commitMessage).toMatch(/^Add Open Graph image and video \(/)
    expect(plan.prTitle).toBe("Add Open Graph image and video: Launch day")
    expect(plan.prBody).toContain("`public/og-video.mp4`")
    expect(plan.prBody).toContain("`metadataBase`")
    expect(plan.prBody).toContain("`og:image` only")
  })

  it("marks an existing video as an update with its blob sha", () => {
    const plan = buildPrPlan({ ...base, video: { existingSha: "abc123" } })
    expect(plan.video).toMatchObject({ action: "update", existingSha: "abc123" })
    expect(plan.prBody).toContain("Replaces `public/og-video.mp4`")
  })

  it("keeps the automatic-image note and still shows the video snippet for app/opengraph-image.png", () => {
    const plan = buildPrPlan({ ...base, filePath: "app/opengraph-image.png", video: { existingSha: null } })
    expect(plan.video?.filePath).toBe("public/og-video.mp4")
    expect(plan.prBody).toContain("picks this file up automatically")
    expect(plan.prBody).toContain("Add the video to your metadata:")
  })
})

describe("executePrPlan with video", () => {
  const plan = buildPrPlan({
    repo,
    filePath: "public/og-image.png",
    existingSha: null,
    params,
    video: { existingSha: "old-video-sha" },
  })

  it("commits the image and then the video to the same branch", async () => {
    const { client, calls } = fakeClient()
    const result = await executePrPlan(client, plan, "aW1hZ2U=", () => {}, "dmlkZW8=")

    expect(result.number).toBe(7)
    const puts = calls.filter((call) => call.name === "putFile").map((call) => call.arg as Record<string, unknown>)
    expect(puts).toHaveLength(2)
    expect(puts[0]).toMatchObject({ path: "public/og-image.png", contentBase64: "aW1hZ2U=", sha: null, branch: plan.headBranch })
    expect(puts[1]).toMatchObject({
      path: "public/og-video.mp4",
      contentBase64: "dmlkZW8=",
      sha: "old-video-sha",
      branch: plan.headBranch,
      message: "Update Open Graph video",
    })
  })

  it("refuses before touching GitHub when the video bytes are missing", async () => {
    const { client } = fakeClient()
    await expect(executePrPlan(client, plan, "aW1hZ2U=")).rejects.toThrow(/video/i)
    expect(client.createBranch).not.toHaveBeenCalled()
  })

  it("commits only the image when the plan has no video", async () => {
    const { client, calls } = fakeClient()
    const imageOnly = buildPrPlan({ repo, filePath: "public/og-image.png", existingSha: null, params })
    await executePrPlan(client, imageOnly, "aW1hZ2U=")
    expect(calls.filter((call) => call.name === "putFile")).toHaveLength(1)
  })
})
