import { useEffect } from 'react'
import { Link } from 'react-router'
import { DEMO_MENU } from '../lib/demo-data.ts'

export function HomePage() {
  useEffect(() => {
    document.title = 'Cardápio AR · veja o prato na sua mesa'
  }, [])

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">Cardápio AR</p>
      <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight">Veja o prato na sua mesa antes de pedir.</h1>
      <p className="mt-4 text-lg text-muted">
        Cardápio digital com pratos em 3D e realidade aumentada no tamanho real. O cliente escaneia o QR code da mesa e
        pronto, sem instalar aplicativo.
      </p>
      <Link
        to={`/${DEMO_MENU.restaurant.slug}`}
        className="mt-8 inline-flex min-h-14 items-center justify-center rounded-2xl bg-accent px-6 text-lg font-bold text-accent-ink"
      >
        Ver demonstração
      </Link>
    </main>
  )
}
