import type { ReactNode } from 'react'

// Peças visuais do painel. Botões e campos com pelo menos 48 px de altura:
// o painel é usado no celular, muitas vezes em pé, na cozinha.

export const inputClass =
  'block min-h-12 w-full rounded-md border-2 border-ink/15 bg-surface px-3 text-base text-ink placeholder:text-muted/70 ' +
  'focus:border-ink focus:outline-none'

export const buttonPrimary =
  'btn-px inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ink px-5 font-bold text-bg ' +
  'disabled:opacity-50'

export const buttonSecondary =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-2 border-ink/20 bg-surface px-4 font-semibold text-ink ' +
  'transition-colors hover:border-ink disabled:opacity-50'

export const buttonDanger =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-2 border-red-700/30 bg-surface px-4 font-semibold text-red-700 ' +
  'transition-colors hover:border-red-700 hover:bg-red-50 disabled:opacity-50'

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: ReactNode
  error?: string | null
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  )
}

export function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border-2 border-ink/10 bg-surface p-4">
      <header>
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </header>
      {children}
    </section>
  )
}

export function Alert({ tone, children }: { tone: 'error' | 'warning' | 'success'; children: ReactNode }) {
  const styles = {
    error: 'border-red-700/30 bg-red-50 text-red-900',
    warning: 'border-amber-600/40 bg-amber-50 text-amber-950',
    success: 'border-emerald-700/30 bg-emerald-50 text-emerald-950',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-md border-2 p-3 text-sm ${styles[tone]}`}>
      {children}
    </div>
  )
}
