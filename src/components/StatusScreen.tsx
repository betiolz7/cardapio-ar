import type { ReactNode } from 'react'

/** Tela cheia para carregando / não encontrado / erro. */
export function StatusScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children && <div className="text-muted">{children}</div>}
    </main>
  )
}

export function LoadingScreen() {
  return (
    <main className="mx-auto max-w-2xl px-4 pt-8" aria-busy="true" aria-label="Carregando cardápio">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-2" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-30 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    </main>
  )
}
