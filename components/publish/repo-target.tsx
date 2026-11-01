"use client"

import { Lock } from "lucide-react"
import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { GitHubRepo } from "@/lib/github/client"
import { TARGET_PATHS, validateTargetPath } from "@/lib/github/plan"

export function RepoTarget({
  repos,
  isLoading,
  selected,
  onSelect,
  path,
  onPathChange,
}: {
  repos: GitHubRepo[] | undefined
  isLoading: boolean
  selected: GitHubRepo | null
  onSelect: (repo: GitHubRepo) => void
  path: string
  onPathChange: (path: string) => void
}) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (repos ?? []).filter((repo) => repo.fullName.toLowerCase().includes(needle)).slice(0, 50)
  }, [repos, query])

  const isPreset = TARGET_PATHS.some((target) => target.path === path)
  const pathError = validateTargetPath(path)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="repo-filter">Repository</Label>
        <Input
          id="repo-filter"
          placeholder={isLoading ? "Loading repositories…" : "Filter repositories"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <ul
          role="listbox"
          aria-label="Repositories"
          className="flex max-h-64 flex-col overflow-y-auto rounded-md border"
        >
          {filtered.map((repo) => {
            const isSelected = selected?.fullName === repo.fullName
            return (
              <li key={repo.fullName} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => onSelect(repo)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm outline-none last:border-b-0 hover:bg-secondary focus-visible:bg-secondary",
                    isSelected && "bg-secondary",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {isSelected ? <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" /> : null}
                    <span className="truncate font-mono">{repo.fullName}</span>
                    {repo.private ? <Lock className="size-3 shrink-0 text-muted-foreground" aria-label="Private" /> : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {repo.canPush ? repo.defaultBranch : "read only"}
                  </span>
                </button>
              </li>
            )
          })}
          {!isLoading && filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No repositories match.</li>
          ) : null}
        </ul>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Destination</legend>
        {TARGET_PATHS.map((target) => (
          <label
            key={target.path}
            className={cn(
              "flex cursor-pointer gap-3 rounded-md border p-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              path === target.path && "border-brand",
            )}
          >
            <input
              type="radio"
              name="target-path"
              checked={path === target.path}
              onChange={() => onPathChange(target.path)}
              className="mt-1 accent-brand"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-mono text-sm">{target.path}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {target.label}. {target.hint}
              </span>
            </span>
          </label>
        ))}
        <label
          className={cn(
            "flex cursor-pointer flex-col gap-2 rounded-md border p-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
            !isPreset && "border-brand",
          )}
        >
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name="target-path"
              checked={!isPreset}
              onChange={() => onPathChange("public/og/card.png")}
              className="accent-brand"
            />
            <span className="text-sm">Custom path</span>
          </span>
          {!isPreset ? (
            <>
              <Input
                aria-label="Custom file path"
                value={path}
                onChange={(event) => onPathChange(event.target.value)}
                aria-invalid={Boolean(pathError)}
                className="font-mono"
              />
              {pathError ? <span className="text-xs text-destructive">{pathError}</span> : null}
            </>
          ) : null}
        </label>
      </fieldset>
    </div>
  )
}
