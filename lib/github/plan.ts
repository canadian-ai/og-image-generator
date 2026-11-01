import { getPreset } from "@/lib/og/presets"
import { OG_HEIGHT, OG_WIDTH, type OgParams } from "@/lib/og/schema"
import type { GitHubClient, GitHubRepo } from "./client"

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

export function metadataSnippet(path: string, params: OgParams): string | null {
  const url = publicUrlFor(path)
  if (!url) return null
  return `export const metadata = {
  openGraph: {
    images: [{ url: "${url}", width: ${OG_WIDTH}, height: ${OG_HEIGHT}, alt: ${JSON.stringify(params.title)} }],
  },
  twitter: { card: "summary_large_image", images: ["${url}"] },
}`
}

export interface PrPlan {
  owner: string
  repo: string
  baseBranch: string
  headBranch: string
  filePath: string
  action: "create" | "update"
  existingSha: string | null
  commitMessage: string
  prTitle: string
  prBody: string
}

export function buildPrPlan(input: {
  repo: Pick<GitHubRepo, "owner" | "name" | "defaultBranch">
  filePath: string
  existingSha: string | null
  params: OgParams
  now?: Date
}): PrPlan {
  const { repo, filePath, existingSha, params } = input
  const LOGO_LABELS = { brand: "Canadian AI mark", custom: "Uploaded logo", none: "None" } as const
  const now = input.now ?? new Date()
  const action = existingSha ? "update" : "create"
  const verb = action === "create" ? "Add" : "Update"
  const preset = getPreset(params.preset)
  const snippet = metadataSnippet(filePath, params)

  const lines = [
    `## ${verb} Open Graph image`,
    "",
    `${action === "create" ? "Adds" : "Replaces"} \`${filePath}\` with a ${OG_WIDTH}x${OG_HEIGHT} PNG rendered by Takumi using the **${preset.name}** preset.`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Title | ${escapeTableCell(params.title)} |`,
    params.description ? `| Description | ${escapeTableCell(params.description)} |` : null,
    `| Eyebrow | ${escapeTableCell(params.eyebrow)} |`,
    `| Site | ${escapeTableCell(params.siteUrl)} |`,
    `| Theme | ${params.theme} |`,
    `| Fonts | ${escapeTableCell(params.headingFont)} / ${escapeTableCell(params.bodyFont)} |`,
    `| Logo | ${LOGO_LABELS[params.logo]} |`,
    "",
    "Rendered in the browser with Takumi WASM; the committed bytes are the ones shown in the review.",
    "",
  ]

  if (filePath.endsWith("opengraph-image.png") && filePath.startsWith("app/")) {
    lines.push("Next.js App Router picks this file up automatically and emits the `og:image` tags.", "")
  } else if (snippet) {
    lines.push("Wire it into your metadata:", "", "```ts", snippet, "```", "")
  }

  lines.push("---", "_Opened from the Canadian AI OG Image Generator. Review the image before merging._")

  return {
    owner: repo.owner,
    repo: repo.name,
    baseBranch: repo.defaultBranch,
    headBranch: headBranchName(params.title, now),
    filePath,
    action,
    existingSha,
    commitMessage: `${verb} Open Graph image (${preset.name})`,
    prTitle: `${verb} Open Graph image: ${params.title}`.slice(0, 120),
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
): Promise<{ number: number; url: string }> {
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
