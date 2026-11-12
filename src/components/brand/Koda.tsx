import { Link } from 'react-router'

// O cachorro de pixel da KodaLabs, convertido da grade 31×30 do logo original.
// Usa currentColor: a cor vem do texto em volta (text-ink, text-bg…).
const DOG =
  'M4 0h3v1h-3zM8 0h7v1h-7zM16 0h3v1h-3zM2 1h8v1h-8zM13 1h8v1h-8zM1 2h9v1h-9zM13 2h9v1h-9zM1 3h9v1h-9zM13 3h9v1h-9z' +
  'M0 4h10v1h-10zM13 4h10v1h-10zM0 5h7v1h-7zM8 5h2v1h-2zM13 5h1v1h-1zM15 5h8v1h-8zM1 6h9v1h-9zM13 6h9v1h-9zM2 7h2v1h-2z' +
  'M5 7h4v1h-4zM14 7h4v1h-4zM19 7h2v1h-2zM2 8h1v1h-1zM5 8h3v1h-3zM10 8h3v1h-3zM15 8h3v1h-3zM20 8h1v1h-1zM2 9h1v1h-1z' +
  'M5 9h3v1h-3zM10 9h3v1h-3zM15 9h3v1h-3zM20 9h1v1h-1zM5 10h3v1h-3zM10 10h3v1h-3zM15 10h3v1h-3zM5 11h1v1h-1zM7 11h2v1h-2z' +
  'M14 11h2v1h-2zM17 11h2v1h-2zM5 12h1v1h-1zM9 12h5v1h-5zM17 12h2v1h-2zM4 13h3v1h-3zM16 13h4v1h-4zM4 14h2v1h-2zM17 14h3v1h-3z' +
  'M4 15h2v1h-2zM17 15h5v1h-5zM28 15h1v1h-1zM4 16h2v1h-2zM17 16h5v1h-5zM27 16h2v1h-2zM4 17h3v1h-3zM16 17h6v1h-6zM27 17h1v1h-1z' +
  'M29 17h1v1h-1zM4 18h4v1h-4zM15 18h8v1h-8zM27 18h1v1h-1zM30 18h1v1h-1zM3 19h6v1h-6zM14 19h10v1h-10zM27 19h1v1h-1z' +
  'M30 19h1v1h-1zM2 20h8v1h-8zM13 20h12v1h-12zM27 20h4v1h-4zM2 21h8v1h-8zM13 21h12v1h-12zM27 21h4v1h-4zM1 22h10v1h-10z' +
  'M13 22h12v1h-12zM26 22h5v1h-5zM1 23h29v1h-29zM2 24h27v1h-27zM2 25h4v1h-4zM9 25h5v1h-5zM18 25h10v1h-10zM1 26h5v1h-5z' +
  'M9 26h5v1h-5zM18 26h7v1h-7zM1 27h5v1h-5zM9 27h5v1h-5zM19 27h6v1h-6zM0 28h1v1h-1zM3 28h2v1h-2zM9 28h5v1h-5zM20 28h1v1h-1z' +
  'M25 28h1v1h-1zM0 29h9v1h-9zM14 29h12v1h-12z'

export function KodaDog({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 31 30" shapeRendering="crispEdges" aria-hidden="true" className={className}>
      <path fill="currentColor" d={DOG} />
    </svg>
  )
}

/** Logo completo: cachorro + "kodalabs" na fonte de pixel. */
export function KodaLogo({ className = '', dogClass = 'size-7' }: { className?: string; dogClass?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-pixel font-semibold lowercase text-ink ${className}`}>
      <KodaDog className={dogClass} />
      <span>kodalabs</span>
    </span>
  )
}

/** Assinatura discreta no rodapé do cardápio do restaurante. */
export function MadeByKoda() {
  return (
    <footer className="mt-12 flex justify-center">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-xs text-muted transition-colors hover:text-ink"
      >
        <span>cardápio em 3D por</span>
        <KodaLogo className="text-sm" dogClass="size-5" />
      </Link>
    </footer>
  )
}
