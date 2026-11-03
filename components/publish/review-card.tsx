"use client"

import { GitBranch, GitPullRequest } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { PrPlan } from "@/lib/github/plan"
import { OG_HEIGHT, OG_WIDTH } from "@/lib/og/schema"

export function ReviewCard({ plan, imageUrl, byteLength }: { plan: PrPlan; imageUrl: string; byteLength: number }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <figure className="flex flex-col gap-2">
        <img
          src={imageUrl}
          alt="The exact PNG that will be committed"
          width={OG_WIDTH}
          height={OG_HEIGHT}
          className="aspect-[1200/630] w-full rounded-md border bg-muted"
        />
        <figcaption className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
          <span>{plan.filePath}</span>
          <span aria-hidden="true">·</span>
          <span>
            {OG_WIDTH}×{OG_HEIGHT}
          </span>
          <span aria-hidden="true">·</span>
          <span>{(byteLength / 1024).toFixed(1)} KB</span>
        </figcaption>
      </figure>

      <div className="flex min-w-0 flex-col gap-4">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Repository</dt>
          <dd className="truncate font-mono">
            {plan.owner}/{plan.repo}
          </dd>
          <dt className="text-muted-foreground">Branch</dt>
          <dd className="flex min-w-0 items-center gap-1.5 font-mono">
            <GitBranch className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{plan.headBranch}</span>
            <span className="shrink-0 text-muted-foreground">→ {plan.baseBranch}</span>
          </dd>
          <dt className="text-muted-foreground">Change</dt>
          <dd>
            <Badge variant={plan.action === "create" ? "default" : "secondary"}>
              {plan.action === "create" ? "New file" : "Replaces existing file"}
            </Badge>
          </dd>
          <dt className="text-muted-foreground">Commit</dt>
          <dd className="truncate">{plan.commitMessage}</dd>
        </dl>

        <div className="flex flex-col overflow-hidden rounded-md border">
          <div className="flex items-center gap-2 border-b bg-secondary px-3 py-2 text-sm font-medium">
            <GitPullRequest className="size-4 text-brand" aria-hidden="true" />
            <span className="truncate">{plan.prTitle}</span>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {plan.prBody}
          </pre>
        </div>
      </div>
    </div>
  )
}
