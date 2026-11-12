import type { ReactNode } from 'react'

// Peças visuais do painel. Botões e campos com pelo menos 48 px de altura:
// o painel é usado no celular, muitas vezes em pé, na cozinha.

export const inputClass =
  'block min-h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink placeholder:text-muted/70 ' +
  'focus:border-accent focus:outline-none'

export const buttonPrimary =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-bold text-accent-ink ' +
  'transition-opacity disabled:opacity-50'

export const buttonSecondary =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 px-4 font-semibold text-ink ' +
  'transition-colors hover:bg-line disabled:opacity-50'

export const buttonDanger =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/40 px-4 font-semibold text-red-300 ' +
  'transition-colors hover:bg-red-500/10 disabled:opacity-50'

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
      {error ? <p className="text-sm text-red-300">{error}</p> : hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  )
}

export function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <header>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </header>
      {children}
    </section>
  )
}

export function Alert({ tone, children }: { tone: 'error' | 'warning' | 'success'; children: ReactNode }) {
  const styles = {
    error: 'border-red-500/40 bg-red-500/10 text-red-200',
    warning: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
    success: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${styles[tone]}`}>
      {children}
    </div>
  )
}
