import { useEffect } from 'react'
import { Link } from 'react-router'
import { KodaDog, KodaLogo } from '../components/brand/Koda.tsx'
import { DEMO_MENU } from '../lib/demo-data.ts'

const STEPS = [
  { n: '01', title: 'Escaneia', text: 'O cliente aponta a câmera para o QR code da mesa. Sem baixar aplicativo.' },
  { n: '02', title: 'Gira em 3D', text: 'Cada prato aparece em 3D, para ver de todos os lados antes de pedir.' },
  { n: '03', title: 'Vê na mesa', text: 'Com a realidade aumentada, o prato surge em cima da mesa, no tamanho real.' },
]

export function HomePage() {
  useEffect(() => {
    document.title = 'Cardápio AR · KodaLabs'
  }, [])

  return (
    <div className="min-h-dvh bg-pixel-grid">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <KodaLogo className="text-xl" dogClass="size-8" />
        <Link to="/login" className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-muted hover:text-ink">
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="grid items-center gap-10 pt-8 md:grid-cols-[1.2fr_1fr] md:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border-2 border-ink bg-surface px-2.5 py-1 font-pixel text-sm text-ink">
              <span className="size-2 bg-sky" aria-hidden="true" />
              Cardápio AR
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] text-ink sm:text-5xl">
              Veja o prato na sua mesa antes de pedir.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
              Cardápio digital com pratos em 3D e realidade aumentada no tamanho real. O cliente escaneia o QR code e pronto.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={`/${DEMO_MENU.restaurant.slug}`}
                className="btn-px inline-flex min-h-14 items-center justify-center rounded-md bg-ink px-6 text-lg font-bold text-bg"
              >
                Ver demonstração
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
            <div className="rounded-lg border-2 border-ink bg-surface p-8 shadow-px-lg">
              <KodaDog className="mx-auto w-full max-w-60 text-ink" />
            </div>
            <span className="absolute -top-3 -right-3 rounded-md border-2 border-ink bg-sky px-2 py-0.5 font-pixel text-sm text-ink">
              3D
            </span>
          </div>
        </section>

        <section aria-label="Como funciona" className="mt-20 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <article key={s.n} className="rounded-lg border-2 border-ink/15 bg-surface p-5">
              <p className="font-pixel text-sm text-blue">{s.n}</p>
              <h2 className="mt-2 text-xl font-bold text-ink">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t-2 border-ink/10 py-6 text-center text-sm text-muted">
        <KodaLogo className="text-base" dogClass="size-5" /> · tecnologia para restaurantes
      </footer>
    </div>
  )
}
