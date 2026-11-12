import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { KodaDog } from '../components/brand/Koda.tsx'
import { publicOrigin, tableUrl } from '../lib/qr.ts'
import { useAdmin } from './admin-context.ts'
import { listTables, type AdminTable } from './data.ts'
import { QrCode } from './QrCode.tsx'

/** Folha A4 com as plaquinhas (2 por linha), pronta para imprimir e recortar. */
export function PrintTablesPage() {
  const { membership } = useAdmin()
  const { restaurant } = membership
  const origin = publicOrigin()
  const [tables, setTables] = useState<AdminTable[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = `Plaquinhas · ${restaurant.name}`
    let active = true
    listTables(restaurant.id).then(
      (list) => active && setTables(list),
      (e: unknown) => active && setError(e instanceof Error ? e.message : 'Erro ao carregar.'),
    )
    return () => {
      active = false
    }
  }, [restaurant.id, restaurant.name])

  return (
    <div className="min-h-dvh bg-white text-black">
      <div className="mx-auto max-w-[190mm] px-4 py-6 print:max-w-none print:p-0">
        <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
          <Link to="/admin/mesas" className="inline-flex min-h-12 items-center rounded-md border border-black/20 px-4 font-semibold">
            ← Voltar
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!tables?.length}
            className="inline-flex min-h-12 items-center rounded-md bg-black px-5 font-bold text-white disabled:opacity-50"
          >
            Imprimir
          </button>
          <p className="text-sm text-black/60">Dica: imprima em papel mais grosso e recorte nas linhas tracejadas.</p>
        </div>

        {error && <p role="alert">{error}</p>}
        {tables === null && !error && <p>Carregando…</p>}

        <div className="grid grid-cols-2 gap-4 print:gap-[6mm]">
          {tables?.map((table) => (
            <article
              key={table.id}
              className="flex break-inside-avoid flex-col items-center rounded-lg border-2 border-dashed border-black/30 p-5 text-center"
            >
              <p className="text-sm font-semibold uppercase tracking-widest">{restaurant.name}</p>
              <QrCode
                value={tableUrl(origin, restaurant.slug, table.token)}
                label={`QR code da ${table.label}`}
                className="my-3 aspect-square w-full max-w-[55mm]"
              />
              <p className="text-2xl font-bold">{table.label}</p>
              <p className="mt-2 text-sm leading-snug">
                Aponte a câmera do celular
                <br />
                <strong>e veja os pratos em 3D na sua mesa</strong>
              </p>
              <p className="mt-3 inline-flex items-center gap-1 font-pixel text-[10px] text-black/50">
                <KodaDog className="size-3" /> kodalabs
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
