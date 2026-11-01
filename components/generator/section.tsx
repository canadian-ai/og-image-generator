"use client"

import { ChevronDown } from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionProps {
  title: string
  /** Shown beside the title while collapsed or expanded, e.g. the selected preset. */
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
}

export function Section({ title, summary, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <section className="flex flex-col gap-4 border-t pt-4 first:border-t-0 first:pt-0">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="group flex w-full items-center gap-3 rounded-sm text-left uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 shrink-0 transition-transform duration-200 group-hover:text-foreground", !open && "-rotate-90")}
          />
          <span className="group-hover:text-foreground">{title}</span>
          {summary ? (
            <span className="ml-auto min-w-0 truncate text-xs font-normal normal-case tracking-normal text-foreground">
              {summary}
            </span>
          ) : null}
        </button>
      </h2>
      <div id={panelId} hidden={!open}>
        {children}
      </div>
    </section>
  )
}
