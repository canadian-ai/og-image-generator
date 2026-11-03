"use client"

import { Check, ExternalLink, GitPullRequest, LogOut } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import useSWR from "swr"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { bytesToBase64 } from "@/lib/encoding"
import { createGitHubClient, type GitHubRepo } from "@/lib/github/client"
import { buildPrPlan, executePrPlan, TARGET_PATHS, validateTargetPath, videoPathFor, type PrPlan, type PrStep } from "@/lib/github/plan"
import type { OgAssets } from "@/lib/og/assets"
import type { OgParams } from "@/lib/og/schema"
import { canEncodeMp4, encodeMp4, MP4_MIME } from "@/lib/og/video/encode"
import { buildVideoScene } from "@/lib/og/video/scene"
import type { OgRender } from "@/hooks/use-og-render"
import { RepoTarget } from "./repo-target"
import { ReviewCard, type ReviewVideo } from "./review-card"
import { TokenConnect } from "./token-connect"

interface Review {
  plan: PrPlan
  base64: string
  imageUrl: string
  byteLength: number
  renderKey: string
  video: (ReviewVideo & { base64: string }) | null
}

const STEP_LABELS: Record<PrStep, string> = {
  branch: "Creating branch",
  commit: "Committing files",
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
  assets: OgAssets
  /** The in-browser render currently on screen; committed byte-for-byte. */
  render: OgRender | undefined
  isDraftValid: boolean
  onOpened?: (pullRequest: { number: number; url: string }) => void
}

export function PublishPanel({ params, assets, render, isDraftValid, onOpened }: PublishPanelProps) {
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
  const [includeVideo, setIncludeVideo] = useState(true)
  const [encodeProgress, setEncodeProgress] = useState<number | null>(null)
  const [step, setStep] = useState<PrStep | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ number: number; url: string } | null>(null)

  const canEncode = useSWR("can-encode-mp4", canEncodeMp4, { revalidateOnFocus: false })
  const videoSupported = canEncode.data !== false

  const reviewIsCurrent =
    review !== null &&
    render !== undefined &&
    review.renderKey === render.key &&
    review.plan.filePath === path &&
    review.plan.repo === repo?.name &&
    review.plan.owner === repo?.owner &&
    Boolean(review.video) === (includeVideo && videoSupported)

  useEffect(() => {
    if (!review) return
    return () => {
      URL.revokeObjectURL(review.imageUrl)
      if (review.video) URL.revokeObjectURL(review.video.url)
    }
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

      let video: Review["video"] = null
      let videoSha: string | null = null
      if (includeVideo && videoSupported) {
        videoSha = await client.getFileSha(repo.owner, repo.name, videoPathFor(path), repo.defaultBranch)
        setEncodeProgress(0)
        const scene = await buildVideoScene(params, assets)
        const mp4 = await encodeMp4(scene, { onProgress: setEncodeProgress })
        video = {
          base64: bytesToBase64(mp4),
          url: URL.createObjectURL(new Blob([mp4 as BlobPart], { type: MP4_MIME })),
          byteLength: mp4.byteLength,
        }
      }

      const plan = buildPrPlan({ repo, filePath: path, existingSha, params, video: includeVideo && videoSupported ? { existingSha: videoSha } : null })
      setReview({
        plan,
        base64: bytesToBase64(bytes),
        imageUrl: URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/png" })),
        byteLength: bytes.byteLength,
        renderKey: render.key,
        video,
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not prepare the review.")
    } finally {
      setEncodeProgress(null)
      setIsPreparing(false)
    }
  }

  const openPullRequest = async () => {
    if (!client || !review || !reviewIsCurrent) return
    setError(null)
    try {
      const created = await executePrPlan(client, review.plan, review.base64, setStep, review.video?.base64)
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
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeVideo && videoSupported}
                disabled={!videoSupported || isPreparing}
                onChange={(event) => setIncludeVideo(event.target.checked)}
                className="mt-1 size-4 accent-brand"
              />
              <span className="flex flex-col">
                <span>Also commit the animated MP4</span>
                <span className="text-xs text-muted-foreground">
                  {videoSupported
                    ? `Adds ${videoPathFor(path)} and the og:video metadata. Encoded here, in your browser.`
                    : "This browser cannot encode H.264 video, so only the image will be committed."}
                </span>
              </span>
            </label>
            <div>
              <Button onClick={prepareReview} disabled={!canReview} variant={reviewIsCurrent ? "outline" : "default"}>
                {isPreparing
                  ? encodeProgress !== null
                    ? `Encoding video ${Math.round(encodeProgress * 100)}%…`
                    : "Preparing review…"
                  : reviewIsCurrent
                    ? "Refresh review"
                    : "Review changes"}
              </Button>
            </div>
          </Stage>
        ) : null}

        {review ? (
          <Stage title="Review and open the pull request" done={Boolean(result)}>
            <ReviewCard plan={review.plan} imageUrl={review.imageUrl} byteLength={review.byteLength} video={review.video} />
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
