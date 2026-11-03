"use client"

import { Check, ChevronDown } from "lucide-react"
import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionProps {
  /** 1-based position in the step list. */
  index: number
  title: string
  /** Shown beside the title, e.g. the selected preset. */
  summary?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Marks the step with a check once the user has moved past it. */
  done?: boolean
  children: ReactNode
}

export function Section({ index, title, summary, open, onOpenChange, done = false, children }: SectionProps) {
  const panelId = useId()

  return (
    <li className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 after:absolute after:bottom-0 after:left-4 after:top-10 after:w-px after:bg-border last:after:hidden">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 items-center justify-center rounded-full border font-mono text-xs transition-colors",
          done
            ? "border-brand bg-brand text-brand-foreground"
            : open
              ? "border-foreground text-foreground"
              : "text-muted-foreground",
        )}
      >
        {done ? <Check className="size-4" /> : index}
      </span>
      <div className="flex min-w-0 flex-col gap-4 pb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => onOpenChange(!open)}
            className="group flex min-h-8 w-full items-center gap-3 rounded-sm text-left uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className={cn("group-hover:text-foreground", open && "text-foreground")}>
              <span className="sr-only">{`Step ${index}: `}</span>
              {title}
            </span>
            {summary ? (
              <span className="ml-auto min-w-0 truncate text-xs font-normal normal-case tracking-normal text-foreground">
                {summary}
              </span>
            ) : null}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 transition-transform duration-200 group-hover:text-foreground",
                !summary && "ml-auto",
                !open && "-rotate-90",
              )}
            />
          </button>
        </h2>
        <div id={panelId} hidden={!open} className="flex flex-col gap-5">
          {children}
        </div>
      </div>
    </li>
  )
}
