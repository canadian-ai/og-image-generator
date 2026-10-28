import { CaiLogo } from "@/components/cai-logo"
import { Generator } from "@/components/generator/generator"

export default function Page() {
  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <CaiLogo className="size-7" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight">OG Image Generator</span>
              <span className="text-xs leading-tight text-muted-foreground">Canadian AI brand tools</span>
            </div>
          </div>
          <nav aria-label="Related tools" className="flex items-center gap-4 text-sm text-muted-foreground">
            <a className="hover:text-foreground" href="https://github.com/canadian-ai/favicon-generator">
              Favicon Generator
            </a>
            <a className="hover:text-foreground" href="https://github.com/canadian-ai/brand-components">
              Brand components
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-8 flex max-w-2xl flex-col gap-3">
          <h1 className="font-serif text-4xl font-bold leading-tight text-balance md:text-5xl">
            Social cards, rendered and reviewed before they ship.
          </h1>
          <p className="leading-relaxed text-muted-foreground text-pretty">
            Pick a preset, write the copy, choose a font and logo, and Takumi renders a 1200×630 PNG right in your browser. Connect a GitHub
            token to commit it to a branch, check exactly what will land, then open the pull request.
          </p>
        </div>
        <Generator />
      </main>
    </div>
  )
}
