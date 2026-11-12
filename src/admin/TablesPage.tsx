import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { nextTableLabels, publicOrigin, qrSvg, tableUrl } from '../lib/qr.ts'
import { slugify } from '../lib/text.ts'
import { useAdmin } from './admin-context.ts'
import { AdminHeader } from './AdminHeader.tsx'
import { createTables, deleteTable, listTables, regenerateTableToken, renameTable, type AdminTable } from './data.ts'
import { QrCode } from './QrCode.tsx'
import { Alert, Section, buttonDanger, buttonPrimary, buttonSecondary, inputClass } from './ui.tsx'

export function TablesPage() {
  const { membership } = useAdmin()
  const { restaurant } = membership
  const origin = publicOrigin()
  const [data, setData] = useState<{ restaurantId: string; tables: AdminTable[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState('')
  const [count, setCount] = useState('10')
  const [editing, setEditing] = useState<{ id: string; label: string } | null>(null)

  useEffect(() => {
    document.title = `Mesas · ${restaurant.name}`
  }, [restaurant.name])

  const reload = async () => {
    const tables = await listTables(restaurant.id)
    setData({ restaurantId: restaurant.id, tables })
  }

  useEffect(() => {
    let active = true
    listTables(restaurant.id).then(
      (tables) => active && setData({ restaurantId: restaurant.id, tables }),
      (e: unknown) => active && setError(e instanceof Error ? e.message : 'Erro ao carregar.'),
    )
    return () => {
      active = false
    }
  }, [restaurant.id])

  const tables = data?.restaurantId === restaurant.id ? data.tables : null

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setBusy(false)
    }
  }

  const onAddOne = (e: FormEvent) => {
    e.preventDefault()
    const name = label.trim()
    if (!name) return
    void run(async () => {
      await createTables(restaurant.id, [name])
      setLabel('')
    })
  }

  const onAddMany = (e: FormEvent) => {
    e.preventDefault()
    const n = Number(count)
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      setError('Informe uma quantidade de 1 a 50.')
      return
    }
    void run(() => createTables(restaurant.id, nextTableLabels(tables?.map((t) => t.label) ?? [], n)))
  }

  const onRename = (e: FormEvent) => {
    e.preventDefault()
    if (!editing?.label.trim()) return
    const { id, label: newLabel } = editing
    void run(async () => {
      await renameTable(id, newLabel.trim())
      setEditing(null)
    })
  }

  async function download(table: AdminTable) {
    const svg = await qrSvg(tableUrl(origin, restaurant.slug, table.token))
    const href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const a = document.createElement('a')
    a.href = href
    a.download = `qr-${restaurant.slug}-${slugify(table.label) || 'mesa'}.svg`
    a.click()
    URL.revokeObjectURL(href)
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24">
      <AdminHeader />
      <div className="mt-4 space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        <Section
          title="Mesas e QR codes"
          description="Cada mesa tem um QR code próprio. Ele abre o cardápio e mostra nas métricas de qual mesa veio a visita."
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/admin/mesas/imprimir" className={`${buttonPrimary} flex-1 ${tables?.length ? '' : 'pointer-events-none opacity-50'}`}>
              Imprimir plaquinhas
            </Link>
          </div>

          <form onSubmit={onAddMany} className="flex items-end gap-2">
            <label className="flex-1 text-sm font-semibold">
              Adicionar mesas numeradas
              <input
                aria-label="Quantidade de mesas"
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <button type="submit" disabled={busy} className={buttonSecondary}>
              Adicionar
            </button>
          </form>

          <form onSubmit={onAddOne} className="flex items-end gap-2">
            <label className="flex-1 text-sm font-semibold">
              Ou uma mesa com nome
              <input
                aria-label="Nome da mesa"
                placeholder="Ex.: Varanda 2, Balcão"
                maxLength={40}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <button type="submit" disabled={busy || !label.trim()} className={buttonSecondary}>
              Adicionar
            </button>
          </form>
        </Section>

        {tables === null && !error && <p className="text-center text-muted">Carregando mesas…</p>}
        {tables?.length === 0 && (
          <p className="rounded-lg border border-dashed border-line p-6 text-center text-muted">Nenhuma mesa ainda.</p>
        )}

        {tables && tables.length > 0 && (
          <ul className="space-y-3">
            {tables.map((table) => {
              const url = tableUrl(origin, restaurant.slug, table.token)
              return (
                <li key={table.id} className="flex gap-3 rounded-lg border border-line bg-surface p-3">
                  <QrCode value={url} label={`QR code da ${table.label}`} className="size-24 shrink-0 overflow-hidden rounded-lg bg-white p-1" />
                  <div className="min-w-0 flex-1 space-y-2">
                    {editing?.id === table.id ? (
                      <form onSubmit={onRename} className="flex gap-2">
                        <input
                          aria-label="Novo nome da mesa"
                          autoFocus
                          maxLength={40}
                          value={editing.label}
                          onChange={(e) => setEditing({ id: table.id, label: e.target.value })}
                          className={inputClass}
                        />
                        <button type="submit" disabled={busy} className={buttonPrimary}>
                          Salvar
                        </button>
                      </form>
                    ) : (
                      <p className="font-semibold">{table.label}</p>
                    )}
                    <p className="truncate text-xs text-muted" title={url}>
                      {url}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => download(table)} className={`${buttonSecondary} min-h-10 px-3 text-sm`}>
                        Baixar QR
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing({ id: table.id, label: table.label })}
                        className={`${buttonSecondary} min-h-10 px-3 text-sm`}
                      >
                        Renomear
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Gerar um novo QR para a ${table.label}? A plaquinha antiga continua abrindo o cardápio, mas deixa de contar nas métricas desta mesa.`)) {
                            void run(() => regenerateTableToken(table.id))
                          }
                        }}
                        className={`${buttonSecondary} min-h-10 px-3 text-sm`}
                      >
                        Novo código
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Excluir a ${table.label}?`)) void run(() => deleteTable(table.id))
                        }}
                        className={`${buttonDanger} min-h-10 px-3 text-sm`}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
