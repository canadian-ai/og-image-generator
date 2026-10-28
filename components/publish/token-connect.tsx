"use client"

import { KeyRound } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const NEW_TOKEN_URL = "https://github.com/settings/personal-access-tokens/new"

export function TokenConnect({
  onConnect,
  isConnecting,
  error,
}: {
  onConnect: (token: string) => void
  isConnecting: boolean
  error?: string
}) {
  const [value, setValue] = useState("")

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const token = value.trim()
    if (token) onConnect(token)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="gh-token">GitHub token</Label>
        <div className="flex gap-2">
          <Input
            id="gh-token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="github_pat_…"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="gh-token-help"
            className="font-mono"
          />
          <Button type="submit" disabled={!value.trim() || isConnecting}>
            <KeyRound aria-hidden="true" />
            {isConnecting ? "Checking…" : "Connect"}
          </Button>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
      <div id="gh-token-help" className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
        <p>
          Use a{" "}
          <a href={NEW_TOKEN_URL} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4">
            fine-grained personal access token
          </a>{" "}
          scoped to the target repository with <span className="text-foreground">Contents: read and write</span> and{" "}
          <span className="text-foreground">Pull requests: read and write</span>.
        </p>
        <p>
          The token stays in this tab&apos;s memory and is sent only to api.github.com. It is never stored or sent to this
          app&apos;s server. Reloading the page forgets it.
        </p>
      </div>
    </form>
  )
}
