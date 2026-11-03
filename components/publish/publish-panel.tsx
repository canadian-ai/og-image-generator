"use client"

import { Check, ExternalLink, GitPullRequest, LogOut } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import useSWR from "swr"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { bytesToBase64 } from "@/lib/encoding"
import { createGitHubClient, type GitHubRepo } from "@/lib/github/client"
import { buildPrPlan, executePrPlan, TARGET_PATHS, validateTargetPath, type PrPlan, type PrStep } from "@/lib/github/plan"
import type { OgParams } from "@/lib/og/schema"
import type { OgRender } from "@/hooks/use-og-render"
import { RepoTarget } from "./repo-target"
import { ReviewCard } from "./review-card"
import { TokenConnect } from "./token-connect"

interface Review {
  plan: PrPlan
  base64: string
  imageUrl: string
  byteLength: number
  renderKey: string
}

const STEP_LABELS: Record<PrStep, string> = {
  branch: "Creating branch",
  commit: "Committing image",
  "pull-request": "Opening pull request",
}

function Stage({ title, done, children }: { title: string; done: boolean; children: ReactNode }) {
  return (
    <li className="flex min-w-0 flex-col gap-3 border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Check
          aria-hidden="true"
          className={cn("size-4 shrink-0", done ? "text-brand" : "text-muted-foreground/40")}
        />
        {title}
        {done ? <span className="sr-only">(done)</span> : null}
      </h3>
      {children}
    </li>
  )
}

interface PublishPanelProps {
  params: OgParams
  /** The in-browser render currently on screen; committed byte-for-byte. */
  render: OgRender | undefined
  isDraftValid: boolean
  onOpened?: (pullRequest: { number: number; url: string }) => void
}

export function PublishPanel({ params, render, isDraftValid, onOpened }: PublishPanelProps) {
  const [token, setToken] = useState<string | null>(null)
  const client = useMemo(() => (token ? createGitHubClient(token) : null), [token])

  const user = useSWR(client ? ["gh-user", token] : null, () => client!.getUser(), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  const repos = useSWR(user.data ? ["gh-repos", token] : null, () => client!.listRepos(), { revalidateOnFocus: false })

  const [repo, setRepo] = useState<GitHubRepo | null>(null)
  const [path, setPath] = useState<string>(TARGET_PATHS[0].path)
  const [review, setReview] = useState<Review | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [step, setStep] = useState<PrStep | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ number: number; url: string } | null>(null)

  const reviewIsCurrent =
    review !== null &&
    render !== undefined &&
    review.renderKey === render.key &&
    review.plan.filePath === path &&
    review.plan.repo === repo?.name &&
    review.plan.owner === repo?.owner

  useEffect(() => {
    if (!review) return
    return () => URL.revokeObjectURL(review.imageUrl)
  }, [review])

  const disconnect = () => {
    setToken(null)
    setRepo(null)
    setReview(null)
    setResult(null)
    setError(null)
  }

  const prepareReview = async () => {
    if (!client || !repo || !render) return
    setIsPreparing(true)
    setError(null)
    setResult(null)
    try {
      const bytes = render.png
      const existingSha = await client.getFileSha(repo.owner, repo.name, path, repo.defaultBranch)
      const plan = buildPrPlan({ repo, filePath: path, existingSha, params })
      setReview({
        plan,
        base64: bytesToBase64(bytes),
        imageUrl: URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/png" })),
        byteLength: bytes.byteLength,
        renderKey: render.key,
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not prepare the review.")
    } finally {
      setIsPreparing(false)
    }
  }

  const openPullRequest = async () => {
    if (!client || !review || !reviewIsCurrent) return
    setError(null)
    try {
      const created = await executePrPlan(client, review.plan, review.base64, setStep)
      setResult(created)
      onOpened?.(created)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open the pull request.")
    } finally {
      setStep(null)
    }
  }

  const pathError = validateTargetPath(path)
  const canReview = Boolean(repo?.canPush) && !pathError && isDraftValid && Boolean(render) && !isPreparing

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Nothing is pushed until you have reviewed the exact image, branch, and PR description.
      </p>

      <ol className="flex flex-col gap-5">
        <Stage title="Connect GitHub" done={Boolean(user.data)}>
          {user.data ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src={user.data.avatarUrl} alt="" width={32} height={32} className="size-8 rounded-full" />
                <span className="text-sm">
                  Connected as <span className="font-mono">{user.data.login}</span>
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={disconnect}>
                <LogOut aria-hidden="true" />
                Forget token
              </Button>
            </div>
          ) : (
            <TokenConnect onConnect={setToken} isConnecting={user.isLoading} error={user.error?.message} />
          )}
        </Stage>

        {user.data ? (
          <Stage title="Choose repository and destination" done={Boolean(repo) && !pathError}>
            <RepoTarget
              repos={repos.data}
              isLoading={repos.isLoading}
              selected={repo}
              onSelect={setRepo}
              path={path}
              onPathChange={setPath}
            />
            {repos.error ? <p className="text-sm text-destructive">{repos.error.message}</p> : null}
            {repo && !repo.canPush ? (
              <p className="text-sm text-destructive">This token cannot push to {repo.fullName}.</p>
            ) : null}
            <div>
              <Button onClick={prepareReview} disabled={!canReview} variant={reviewIsCurrent ? "outline" : "default"}>
                {isPreparing ? "Preparing review…" : reviewIsCurrent ? "Refresh review" : "Review changes"}
              </Button>
            </div>
          </Stage>
        ) : null}

        {review ? (
          <Stage title="Review and open the pull request" done={Boolean(result)}>
            <ReviewCard plan={review.plan} imageUrl={review.imageUrl} byteLength={review.byteLength} />
            {!reviewIsCurrent ? (
              <p role="status" className="text-sm text-muted-foreground">
                The card, repository, or path changed since this review. Refresh the review before opening a PR.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              {result ? (
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "default" })}
                >
                  <ExternalLink aria-hidden="true" />
                  View pull request #{result.number}
                </a>
              ) : (
                <Button onClick={openPullRequest} disabled={!reviewIsCurrent || step !== null}>
                  <GitPullRequest aria-hidden="true" />
                  {step ? `${STEP_LABELS[step]}…` : "Open pull request"}
                </Button>
              )}
              <span role="status" className="text-xs text-muted-foreground">
                {result ? "Pull request opened. Review and merge it on GitHub." : null}
              </span>
            </div>
          </Stage>
        ) : null}
      </ol>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
