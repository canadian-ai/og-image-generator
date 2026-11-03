import { getPreset } from "@/lib/og/presets"
import { OG_HEIGHT, OG_WIDTH, type OgParams } from "@/lib/og/schema"
import { themeName } from "@/lib/og/themes"
import type { GitHubClient, GitHubRepo } from "./client"

function themeLabel(params: OgParams): string {
  if (params.theme !== "custom") return themeName(params.theme)
  const { background, foreground, accent } = params.customColors
  return `Custom (background ${background}, text ${foreground}, accent ${accent})`
}

export const TARGET_PATHS = [
  {
    path: "app/opengraph-image.png",
    label: "Next.js App Router convention",
    hint: "Next.js wires og:image automatically. No code changes needed.",
  },
  {
    path: "public/og-image.png",
    label: "Static public asset",
    hint: "Served at /og-image.png. Reference it from your metadata.",
  },
] as const

const SAFE_PATH = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/

/** Returns an error message, or null when the path is safe to commit to. */
export function validateTargetPath(path: string): string | null {
  const trimmed = path.trim()
  if (!trimmed) return "Path is required."
  if (trimmed.startsWith("/")) return "Use a repository-relative path without a leading slash."
  if (trimmed.split("/").some((segment) => segment === ".." || segment === ".")) return "Path cannot contain . or .. segments."
  if (trimmed.startsWith(".git/") || trimmed.startsWith(".github/")) return "Path cannot target .git or .github."
  if (!SAFE_PATH.test(trimmed)) return "Use letters, numbers, dots, dashes and underscores only."
  if (!trimmed.toLowerCase().endsWith(".png")) return "The file must be a .png."
  return null
}

export function slugify(value: string, maxLength = 40): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, maxLength)
      .replace(/-+$/g, "") || "card"
  )
}

export function headBranchName(title: string, now: Date): string {
  const stamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 12)
  return `og-image/${slugify(title)}-${stamp}`
}

/** Public URL path for a committed file, if the framework serves it statically. */
export function publicUrlFor(path: string): string | null {
  if (path.startsWith("public/")) return path.slice("public".length)
  return null
}

const VIDEO_FILE_NAME = "og-video.mp4"

/** The video sits beside a public image; for the App Router convention it goes in `public/`. */
export function videoPathFor(imagePath: string): string {
  if (!imagePath.startsWith("public/")) return `public/${VIDEO_FILE_NAME}`
  const directory = imagePath.slice(0, imagePath.lastIndexOf("/"))
  return `${directory}/${VIDEO_FILE_NAME}`
}

export function metadataSnippet(path: string, params: OgParams, videoPath?: string | null): string | null {
  const imageUrl = publicUrlFor(path)
  const videoUrl = videoPath ? publicUrlFor(videoPath) : null
  if (!imageUrl && !videoUrl) return null

  const openGraph: string[] = []
  if (imageUrl) {
    openGraph.push(
      `    images: [{ url: "${imageUrl}", width: ${OG_WIDTH}, height: ${OG_HEIGHT}, alt: ${JSON.stringify(params.title)} }],`,
    )
  }
  if (videoUrl) {
    openGraph.push(`    videos: [{ url: "${videoUrl}", width: ${OG_WIDTH}, height: ${OG_HEIGHT}, type: "video/mp4" }],`)
  }

  const lines = ["export const metadata = {", "  openGraph: {", ...openGraph, "  },"]
  if (imageUrl) lines.push(`  twitter: { card: "summary_large_image", images: ["${imageUrl}"] },`)
  lines.push("}")
  return lines.join("\n")
}

export interface PrVideoPlan {
  filePath: string
  action: "create" | "update"
  existingSha: string | null
}

export interface PrPlan {
  owner: string
  repo: string
  baseBranch: string
  headBranch: string
  filePath: string
  action: "create" | "update"
  existingSha: string | null
  video: PrVideoPlan | null
  commitMessage: string
  prTitle: string
  prBody: string
}

export function buildPrPlan(input: {
  repo: Pick<GitHubRepo, "owner" | "name" | "defaultBranch">
  filePath: string
  existingSha: string | null
  params: OgParams
  /** Include the animated MP4 alongside the image; `existingSha` is the current file's blob sha at the video path. */
  video?: { existingSha: string | null } | null
  now?: Date
}): PrPlan {
  const { repo, filePath, existingSha, params } = input
  const LOGO_LABELS = { brand: "Canadian AI mark", custom: "Uploaded logo", none: "None" } as const
  const now = input.now ?? new Date()
  const action = existingSha ? "update" : "create"
  const verb = action === "create" ? "Add" : "Update"
  const preset = getPreset(params.preset)
  const video: PrVideoPlan | null = input.video
    ? {
        filePath: videoPathFor(filePath),
        action: input.video.existingSha ? "update" : "create",
        existingSha: input.video.existingSha,
      }
    : null
  const snippet = metadataSnippet(filePath, params, video?.filePath)
  const subject = video ? "Open Graph image and video" : "Open Graph image"
  const isAppConvention = filePath.endsWith("opengraph-image.png") && filePath.startsWith("app/")

  const lines = [
    `## ${verb} ${subject}`,
    "",
    `${action === "create" ? "Adds" : "Replaces"} \`${filePath}\` with a ${OG_WIDTH}x${OG_HEIGHT} PNG rendered by Takumi using the **${preset.name}** preset.`,
    "",
    video
      ? `${video.action === "create" ? "Adds" : "Replaces"} \`${video.filePath}\`, a 4 second ${OG_WIDTH}x${OG_HEIGHT} H.264 clip of the same card. It is built from the card's own layers with fixed easing, so it renders identically every time and loops cleanly.`
      : null,
    video ? "" : null,
    "| Field | Value |",
    "| --- | --- |",
    `| Title | ${escapeTableCell(params.title)} |`,
    params.description ? `| Description | ${escapeTableCell(params.description)} |` : null,
    `| Eyebrow | ${escapeTableCell(params.eyebrow)} |`,
    `| Site | ${escapeTableCell(params.siteUrl)} |`,
    `| Theme | ${themeLabel(params)} |`,
    `| Fonts | ${escapeTableCell(params.headingFont)} / ${escapeTableCell(params.bodyFont)} |`,
    `| Logo | ${LOGO_LABELS[params.logo]} |`,
    "",
    "Rendered in the browser with Takumi WASM; the committed bytes are the ones shown in the review.",
    "",
  ]

  if (isAppConvention) {
    lines.push("Next.js App Router picks this file up automatically and emits the `og:image` tags.", "")
  }
  if (snippet) {
    const intro = isAppConvention ? "Add the video to your metadata:" : "Wire it into your metadata:"
    lines.push(intro, "", "```ts", snippet, "```", "")
  }
  if (video) {
    lines.push(
      "Set `metadataBase` so these paths resolve to absolute URLs. Most link-preview crawlers still read `og:image` only, so the PNG stays the fallback; the video is for the players and apps that do honour `og:video`.",
      "",
    )
  }

  lines.push("---", `_Opened from the Canadian AI OG Image Generator. Review the ${video ? "image and video" : "image"} before merging._`)

  return {
    owner: repo.owner,
    repo: repo.name,
    baseBranch: repo.defaultBranch,
    headBranch: headBranchName(params.title, now),
    filePath,
    action,
    existingSha,
    video,
    commitMessage: `${verb} ${subject} (${preset.name})`,
    prTitle: `${verb} ${subject}: ${params.title}`.slice(0, 120),
    prBody: lines.filter((line): line is string => line !== null).join("\n"),
  }
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ")
}

export type PrStep = "branch" | "commit" | "pull-request"

export async function executePrPlan(
  client: GitHubClient,
  plan: PrPlan,
  contentBase64: string,
  onStep: (step: PrStep) => void = () => {},
  videoBase64?: string,
): Promise<{ number: number; url: string }> {
  if (plan.video && !videoBase64) throw new Error("The video is part of this plan but its bytes are missing.")

  onStep("branch")
  const baseSha = await client.getBranchSha(plan.owner, plan.repo, plan.baseBranch)
  await client.createBranch(plan.owner, plan.repo, plan.headBranch, baseSha)

  onStep("commit")
  await client.putFile({
    owner: plan.owner,
    repo: plan.repo,
    path: plan.filePath,
    branch: plan.headBranch,
    message: plan.commitMessage,
    contentBase64,
    sha: plan.existingSha,
  })
  if (plan.video && videoBase64) {
    await client.putFile({
      owner: plan.owner,
      repo: plan.repo,
      path: plan.video.filePath,
      branch: plan.headBranch,
      message: `${plan.video.action === "create" ? "Add" : "Update"} Open Graph video`,
      contentBase64: videoBase64,
      sha: plan.video.existingSha,
    })
  }

  onStep("pull-request")
  return client.createPullRequest({
    owner: plan.owner,
    repo: plan.repo,
    title: plan.prTitle,
    body: plan.prBody,
    head: plan.headBranch,
    base: plan.baseBranch,
  })
}
