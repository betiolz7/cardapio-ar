import type { ReactNode } from 'react'
import { KodaDog } from './brand/Koda.tsx'

/** Tela cheia para carregando / não encontrado / erro. */
export function StatusScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <KodaDog className="mb-2 size-14 text-ink/80" />
      <h1 className="text-xl font-bold">{title}</h1>
      {children && <div className="text-muted">{children}</div>}
    </main>
  )
}

export function LoadingScreen() {
  return (
    <main className="mx-auto max-w-2xl px-4 pt-8" aria-busy="true" aria-label="Carregando cardápio">
      <div className="flex items-center gap-3">
        <div className="size-14 animate-pulse rounded-md bg-surface-2" />
        <div className="h-8 w-48 animate-pulse rounded-md bg-surface-2" />
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-30 animate-pulse rounded-lg border-2 border-ink/5 bg-surface" />
        ))}
      </div>
    </main>
  )
}
