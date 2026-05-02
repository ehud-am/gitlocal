import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export type MetaTagTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'
export type MetaTagIcon =
  | 'git'
  | 'remote'
  | 'local-only'
  | 'user'
  | 'local-change'
  | 'local-commit'
  | 'remote-update'
  | 'diverged'

interface Props {
  label: string
  icon: MetaTagIcon
  tone?: MetaTagTone
  compact?: boolean
  className?: string
}

function iconFor(name: MetaTagIcon): ReactNode {
  switch (name) {
    case 'git':
      return (
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M10.7 1.2a1.7 1.7 0 0 1 2.4 0l1.7 1.7a1.7 1.7 0 0 1 0 2.4L9 11v2.4l-2 2v-2.4l-1.2-1.2a2.1 2.1 0 1 1 1.1-1.1L8 11.8V9l5.8-5.8a.7.7 0 0 0 0-1l-1.7-1.7a.7.7 0 0 0-1 0L9.9 1.7a2.1 2.1 0 1 1-1.1-1.1z" fill="currentColor" />
        </svg>
      )
    case 'remote':
      return (
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M3 3.5a2 2 0 1 1 3.7 1H9a2.5 2.5 0 0 1 2.4 1.9h.9a2 2 0 1 1 0 1h-.9A2.5 2.5 0 0 1 9 9.3H6.7a2 2 0 1 1 0-1H9a1.5 1.5 0 0 0 1.4-1H9a2.5 2.5 0 0 1-2.3-1.8H6.7A2 2 0 0 1 3 3.5Z" fill="currentColor" />
        </svg>
      )
    case 'local-only':
      return (
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h7A1.5 1.5 0 0 1 13 3.5v6A1.5 1.5 0 0 1 11.5 11H9.8l.7 2H12v1H4v-1h1.5l.7-2H4.5A1.5 1.5 0 0 1 3 9.5v-6ZM4.5 3a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-6a.5.5 0 0 0-.5-.5h-7Z" fill="currentColor" />
        </svg>
      )
    case 'user':
      return (
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M8 8a2.75 2.75 0 1 0 0-5.5A2.75 2.75 0 0 0 8 8Zm0 1c-2.5 0-4.5 1.5-4.5 3.3 0 .4.3.7.7.7h7.6c.4 0 .7-.3.7-.7C12.5 10.5 10.5 9 8 9Z" fill="currentColor" />
        </svg>
      )
    case 'local-change':
      return (
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M8 2.5a5.5 5.5 0 1 1-3.9 1.6L6 6l-4 1 .9-4 1.3 1.3A6.5 6.5 0 1 0 8 1.5v1Z" fill="currentColor" />
        </svg>
      )
    case 'local-commit':
      return (
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M8 13.5 3.8 9.3l.7-.7L7.5 11.6V2h1v9.6l3-3 .7.7L8 13.5Z" fill="currentColor" />
        </svg>
      )
    case 'remote-update':
      return (
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M8 2.5 12.2 6.7l-.7.7-3-3V14h-1V4.4l-3 3-.7-.7L8 2.5Z" fill="currentColor" />
        </svg>
      )
    case 'diverged':
      return (
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M5 2a1.75 1.75 0 1 1 0 3.5H4.5v2.2l3.5 3.5v1.3H7v-1l-3.5-3.5V5.5H3A1.75 1.75 0 0 1 3 2h2Zm6 0A1.75 1.75 0 1 1 11 5.5h-.5V8L7 11.5v1H6v-1.3l3.5-3.5V5.5H9A1.75 1.75 0 0 1 9 2h2Z" fill="currentColor" />
        </svg>
      )
  }
}

const toneClassNames: Record<MetaTagTone, string> = {
  neutral: 'bg-[color-mix(in_srgb,var(--surface-subtle)_92%,transparent)] text-[var(--muted-foreground)] ring-1 ring-inset ring-[var(--border)]',
  info: 'bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[color-mix(in_srgb,var(--primary)_88%,black)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--primary)_26%,transparent)]',
  success: 'bg-[color-mix(in_srgb,#1a7f37_12%,transparent)] text-[#176c31] ring-1 ring-inset ring-[color-mix(in_srgb,#1a7f37_24%,transparent)]',
  warning: 'bg-[color-mix(in_srgb,#9a6700_14%,transparent)] text-[#8a5d00] ring-1 ring-inset ring-[color-mix(in_srgb,#9a6700_24%,transparent)]',
  danger: 'bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--danger)_24%,transparent)]',
}

export function MetaTag({ label, icon, tone = 'neutral', compact = false, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-none font-semibold uppercase tracking-[0.08em]',
        toneClassNames[tone],
        compact && 'gap-1 px-1.5 py-[0.22rem] text-[9px]',
        className,
      )}
    >
      <span className="shrink-0 scale-90">{iconFor(icon)}</span>
      <span className="truncate">{label}</span>
    </span>
  )
}
